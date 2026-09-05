import { describe, expect, it, vi } from "vitest";
import {
  cleanupSpeakingUploads,
  confirmSpeakingUpload,
  discardSpeakingUpload,
  prepareSpeakingUpload,
  speakingRawAudioRetentionMs,
  type DirectSpeakingAttempt,
  type DirectSpeakingRepository,
} from "./direct-upload";

function attempt(
  overrides: Partial<DirectSpeakingAttempt> = {},
): DirectSpeakingAttempt {
  return {
    id: "attempt-1",
    enrollmentId: "enrollment-1",
    sessionItemId: "item-1",
    activityId: "activity-1",
    contentSchemaVersion: 1,
    contentRevision: 1,
    operationKey: "operation-1",
    assetId: "asset-1",
    objectKey: "speaking/user-1/attempt-1/asset-1",
    mimeType: "audio/webm",
    byteLength: 1024,
    durationMs: 2_000,
    status: "reserved",
    etag: null,
    uploadExpiresAt: new Date("2026-09-05T12:20:00.000Z"),
    uploadedAt: null,
    retainedUntil: null,
    discardedAt: null,
    deletedAt: null,
    createdAt: new Date("2026-09-05T12:10:00.000Z"),
    updatedAt: new Date("2026-09-05T12:10:00.000Z"),
    ...overrides,
  };
}

function repository(
  overrides: Partial<DirectSpeakingRepository> = {},
): DirectSpeakingRepository {
  return {
    ownsLessonSessionItem: vi.fn().mockResolvedValue(true),
    reserveAttempt: vi.fn().mockImplementation(async (input) => ({
      inserted: true,
      attempt: attempt({
        id: input.id,
        enrollmentId: input.enrollmentId,
        sessionItemId: input.sessionItemId,
        activityId: input.activityId,
        contentSchemaVersion: input.contentSchemaVersion,
        contentRevision: input.contentRevision,
        operationKey: input.operationKey,
        assetId: input.assetId,
        objectKey: input.objectKey,
        mimeType: input.mimeType,
        byteLength: input.byteLength,
        durationMs: input.durationMs,
        uploadExpiresAt: input.uploadExpiresAt,
        createdAt: input.now,
        updatedAt: input.now,
      }),
    })),
    findOwnedAttempt: vi.fn().mockResolvedValue(attempt()),
    refreshUploadWindow: vi
      .fn()
      .mockImplementation(async (_userId, _attemptId, expires, now) =>
        attempt({ uploadExpiresAt: expires, updatedAt: now }),
      ),
    markUploaded: vi.fn().mockImplementation(async (input) =>
      attempt({
        status: "uploaded",
        etag: input.etag,
        uploadedAt: input.uploadedAt,
        retainedUntil: input.retainedUntil,
        updatedAt: input.now,
      }),
    ),
    discardOwnedAttempt: vi.fn().mockResolvedValue(
      attempt({
        status: "discarded",
        discardedAt: new Date("2026-09-05T12:30:00.000Z"),
      }),
    ),
    listCleanupCandidates: vi.fn().mockResolvedValue([]),
    markDeleted: vi.fn().mockImplementation(async (attemptId, now) =>
      attempt({
        id: attemptId,
        status: "deleted",
        deletedAt: now,
        updatedAt: now,
      }),
    ),
    ...overrides,
  };
}

const input = {
  userId: "user-1",
  enrollmentId: "enrollment-1",
  sessionItemId: "item-1",
  lessonId: "lesson-1",
  activityId: "activity-1",
  contentSchemaVersion: 1,
  contentRevision: 1,
  operationKey: "operation-1",
  mimeType: "audio/webm",
  byteLength: 1024,
  durationMs: 2_000,
} as const;

describe("direct speaking upload lifecycle", () => {
  it("checks ownership before reserving storage metadata", async () => {
    const reserveAttempt = vi.fn();
    const result = await prepareSpeakingUpload(
      {
        repository: repository({
          ownsLessonSessionItem: vi.fn().mockResolvedValue(false),
          reserveAttempt,
        }),
        generateId: () => "unused",
        now: () => new Date("2026-09-05T12:10:00.000Z"),
      },
      input,
    );

    expect(result).toEqual({ ok: false, reason: "ownership_denied" });
    expect(reserveAttempt).not.toHaveBeenCalled();
  });

  it("creates server-controlled ids and object key for a valid recording", async () => {
    const ids = ["attempt-server", "asset-server"];
    const repo = repository();
    const result = await prepareSpeakingUpload(
      {
        repository: repo,
        generateId: () => ids.shift()!,
        now: () => new Date("2026-09-05T12:10:00.000Z"),
      },
      input,
    );

    expect(result).toMatchObject({
      ok: true,
      duplicate: false,
      state: "upload_required",
      attempt: {
        id: "attempt-server",
        assetId: "asset-server",
        objectKey: "speaking/user-1/attempt-server/asset-server",
      },
    });
  });

  it("replays the same operation but rejects changed metadata", async () => {
    const existing = attempt();
    const baseRepository = repository({
      reserveAttempt: vi
        .fn()
        .mockResolvedValue({ inserted: false, attempt: existing }),
    });
    const replay = await prepareSpeakingUpload(
      {
        repository: baseRepository,
        generateId: () => "new-id",
        now: () => new Date("2026-09-05T12:11:00.000Z"),
      },
      input,
    );
    expect(replay).toMatchObject({ ok: true, duplicate: true });

    const conflict = await prepareSpeakingUpload(
      {
        repository: baseRepository,
        generateId: () => "new-id",
        now: () => new Date("2026-09-05T12:11:00.000Z"),
      },
      { ...input, byteLength: 2048 },
    );
    expect(conflict).toEqual({ ok: false, reason: "operation_conflict" });
  });

  it("confirms only exact provider metadata and starts 24h retention", async () => {
    const repo = repository();
    const uploadedAt = new Date("2026-09-05T12:12:00.000Z");
    const result = await confirmSpeakingUpload(
      {
        repository: repo,
        now: () => new Date("2026-09-05T12:12:01.000Z"),
      },
      {
        userId: "user-1",
        attemptId: "attempt-1",
        objectKey: "speaking/user-1/attempt-1/asset-1",
        mimeType: "audio/webm",
        byteLength: 1024,
        etag: "etag-1",
        uploadedAt,
      },
    );

    expect(result).toMatchObject({ ok: true, duplicate: false });
    expect(repo.markUploaded).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: "attempt-1",
        retainedUntil: new Date(
          uploadedAt.getTime() + speakingRawAudioRetentionMs,
        ),
      }),
    );

    const mismatch = await confirmSpeakingUpload(
      {
        repository: repo,
        now: () => new Date("2026-09-05T12:12:01.000Z"),
      },
      {
        userId: "user-1",
        attemptId: "attempt-1",
        objectKey: "speaking/user-1/attempt-1/asset-1",
        mimeType: "audio/webm",
        byteLength: 999,
        etag: "etag-1",
        uploadedAt,
      },
    );
    expect(mismatch).toMatchObject({ ok: false, reason: "object_mismatch" });
  });

  it("keeps discard retryable when object deletion fails", async () => {
    const storage = {
      deletePrivateObject: vi
        .fn()
        .mockRejectedValue(new Error("provider unavailable")),
    };
    const result = await discardSpeakingUpload(
      {
        repository: repository(),
        storage,
        now: () => new Date("2026-09-05T12:30:00.000Z"),
      },
      { userId: "user-1", attemptId: "attempt-1" },
    );

    expect(result).toEqual({
      found: true,
      deleted: false,
      cleanupPending: true,
    });
  });

  it("cleans expired/discarded attempts independently and reports failures", async () => {
    const candidates = [attempt({ id: "a" }), attempt({ id: "b" })];
    const repo = repository({
      listCleanupCandidates: vi.fn().mockResolvedValue(candidates),
    });
    const storage = {
      deletePrivateObject: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("provider unavailable")),
    };

    const result = await cleanupSpeakingUploads(
      {
        repository: repo,
        storage,
        now: () => new Date("2026-09-06T12:30:00.000Z"),
      },
      50,
    );

    expect(result).toEqual({ selected: 2, deleted: 1, failed: 1 });
    expect(repo.markDeleted).toHaveBeenCalledTimes(1);
  });
});
