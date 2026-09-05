import {
  createPrivateSpeakingObjectKey,
  validateSpeakingRecordingMetadata,
  type SpeakingRecordingMetadata,
} from "./recording-contract";

export const speakingUploadWindowMs = 10 * 60 * 1000;
export const speakingRawAudioRetentionMs = 24 * 60 * 60 * 1000;

export type DirectSpeakingAttemptStatus =
  "reserved" | "uploaded" | "discarded" | "deleted";

export type DirectSpeakingAttempt = Readonly<{
  id: string;
  enrollmentId: string;
  sessionItemId: string | null;
  activityId: string;
  contentSchemaVersion: number;
  contentRevision: number;
  operationKey: string;
  assetId: string;
  objectKey: string;
  mimeType: string;
  byteLength: number;
  durationMs: number;
  status: DirectSpeakingAttemptStatus;
  etag: string | null;
  uploadExpiresAt: Date;
  uploadedAt: Date | null;
  retainedUntil: Date | null;
  discardedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export interface DirectSpeakingRepository {
  ownsLessonSessionItem(
    input: Readonly<{
      userId: string;
      enrollmentId: string;
      sessionItemId: string;
      lessonId: string;
    }>,
  ): Promise<boolean>;
  reserveAttempt(
    input: Readonly<{
      id: string;
      enrollmentId: string;
      sessionItemId: string;
      activityId: string;
      contentSchemaVersion: number;
      contentRevision: number;
      operationKey: string;
      assetId: string;
      objectKey: string;
      mimeType: string;
      byteLength: number;
      durationMs: number;
      uploadExpiresAt: Date;
      now: Date;
    }>,
  ): Promise<Readonly<{ inserted: boolean; attempt: DirectSpeakingAttempt }>>;
  findOwnedAttempt(
    userId: string,
    attemptId: string,
  ): Promise<DirectSpeakingAttempt | null>;
  refreshUploadWindow(
    userId: string,
    attemptId: string,
    uploadExpiresAt: Date,
    now: Date,
  ): Promise<DirectSpeakingAttempt | null>;
  markUploaded(
    input: Readonly<{
      attemptId: string;
      etag: string;
      uploadedAt: Date;
      retainedUntil: Date;
      now: Date;
    }>,
  ): Promise<DirectSpeakingAttempt | null>;
  discardOwnedAttempt(
    userId: string,
    attemptId: string,
    now: Date,
  ): Promise<DirectSpeakingAttempt | null>;
  listCleanupCandidates(
    now: Date,
    limit: number,
  ): Promise<readonly DirectSpeakingAttempt[]>;
  markDeleted(
    attemptId: string,
    now: Date,
  ): Promise<DirectSpeakingAttempt | null>;
}

export interface SpeakingObjectDeletion {
  deletePrivateObject(objectKey: string): Promise<void>;
}

export type PrepareSpeakingUploadInput = Readonly<{
  userId: string;
  enrollmentId: string;
  sessionItemId: string;
  lessonId: string;
  activityId: string;
  contentSchemaVersion: number;
  contentRevision: number;
  operationKey: string;
  mimeType: string;
  byteLength: number;
  durationMs: number;
}>;

export type PrepareSpeakingUploadResult =
  | Readonly<{
      ok: true;
      duplicate: boolean;
      state: "upload_required" | "already_uploaded";
      attempt: DirectSpeakingAttempt;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid_recording"
        | "ownership_denied"
        | "operation_conflict"
        | "attempt_closed";
    }>;

export type ConfirmSpeakingUploadResult =
  | Readonly<{
      ok: true;
      duplicate: boolean;
      attempt: DirectSpeakingAttempt;
    }>
  | Readonly<{
      ok: false;
      reason: "attempt_not_found" | "object_mismatch" | "attempt_closed";
      objectKey?: string;
    }>;

export async function prepareSpeakingUpload(
  dependencies: Readonly<{
    repository: DirectSpeakingRepository;
    generateId(): string;
    now(): Date;
  }>,
  input: PrepareSpeakingUploadInput,
): Promise<PrepareSpeakingUploadResult> {
  const owned = await dependencies.repository.ownsLessonSessionItem({
    userId: input.userId,
    enrollmentId: input.enrollmentId,
    sessionItemId: input.sessionItemId,
    lessonId: input.lessonId,
  });
  if (!owned) return { ok: false, reason: "ownership_denied" };

  const attemptId = dependencies.generateId();
  const assetId = dependencies.generateId();
  const metadata: SpeakingRecordingMetadata = {
    operationKey: input.operationKey,
    attemptId,
    activityId: input.activityId,
    mimeType: input.mimeType,
    byteLength: input.byteLength,
    durationMs: input.durationMs,
  };
  const validation = validateSpeakingRecordingMetadata(metadata);
  if (
    !validation.ok ||
    input.contentSchemaVersion < 1 ||
    input.contentRevision < 1
  ) {
    return { ok: false, reason: "invalid_recording" };
  }

  const now = dependencies.now();
  const uploadExpiresAt = new Date(now.getTime() + speakingUploadWindowMs);
  const proposed = {
    id: attemptId,
    enrollmentId: input.enrollmentId,
    sessionItemId: input.sessionItemId,
    activityId: input.activityId,
    contentSchemaVersion: input.contentSchemaVersion,
    contentRevision: input.contentRevision,
    operationKey: input.operationKey,
    assetId,
    objectKey: createPrivateSpeakingObjectKey({
      userId: input.userId,
      attemptId,
      assetId,
    }),
    mimeType: input.mimeType,
    byteLength: input.byteLength,
    durationMs: input.durationMs,
    uploadExpiresAt,
    now,
  } as const;

  const reservation = await dependencies.repository.reserveAttempt(proposed);
  let attempt = reservation.attempt;
  if (!reservation.inserted) {
    if (!sameOperation(attempt, input)) {
      return { ok: false, reason: "operation_conflict" };
    }
    if (attempt.status === "discarded" || attempt.status === "deleted") {
      return { ok: false, reason: "attempt_closed" };
    }
    if (attempt.status === "reserved") {
      attempt =
        (await dependencies.repository.refreshUploadWindow(
          input.userId,
          attempt.id,
          uploadExpiresAt,
          now,
        )) ?? attempt;
    }
  }

  return {
    ok: true,
    duplicate: !reservation.inserted,
    state:
      attempt.status === "uploaded" ? "already_uploaded" : "upload_required",
    attempt,
  };
}

export async function confirmSpeakingUpload(
  dependencies: Readonly<{
    repository: DirectSpeakingRepository;
    now(): Date;
  }>,
  input: Readonly<{
    userId: string;
    attemptId: string;
    objectKey: string;
    mimeType: string;
    byteLength: number;
    etag: string;
    uploadedAt: Date;
  }>,
): Promise<ConfirmSpeakingUploadResult> {
  const attempt = await dependencies.repository.findOwnedAttempt(
    input.userId,
    input.attemptId,
  );
  if (!attempt) return { ok: false, reason: "attempt_not_found" };

  if (attempt.objectKey !== input.objectKey) {
    return { ok: false, reason: "object_mismatch" };
  }
  if (
    attempt.mimeType !== input.mimeType ||
    attempt.byteLength !== input.byteLength ||
    !input.etag.trim()
  ) {
    return {
      ok: false,
      reason: "object_mismatch",
      objectKey: attempt.objectKey,
    };
  }
  if (attempt.status === "discarded" || attempt.status === "deleted") {
    return {
      ok: false,
      reason: "attempt_closed",
      objectKey: attempt.objectKey,
    };
  }
  if (attempt.status === "uploaded") {
    if (attempt.etag !== input.etag) {
      return {
        ok: false,
        reason: "object_mismatch",
        objectKey: attempt.objectKey,
      };
    }
    return { ok: true, duplicate: true, attempt };
  }

  const now = dependencies.now();
  const retainedUntil = new Date(
    input.uploadedAt.getTime() + speakingRawAudioRetentionMs,
  );
  const updated = await dependencies.repository.markUploaded({
    attemptId: attempt.id,
    etag: input.etag,
    uploadedAt: input.uploadedAt,
    retainedUntil,
    now,
  });
  if (!updated) return { ok: false, reason: "attempt_not_found" };
  if (updated.status === "discarded" || updated.status === "deleted") {
    return {
      ok: false,
      reason: "attempt_closed",
      objectKey: updated.objectKey,
    };
  }
  if (updated.status !== "uploaded" || updated.etag !== input.etag) {
    return {
      ok: false,
      reason: "object_mismatch",
      objectKey: updated.objectKey,
    };
  }
  return { ok: true, duplicate: false, attempt: updated };
}

export async function discardSpeakingUpload(
  dependencies: Readonly<{
    repository: DirectSpeakingRepository;
    storage: SpeakingObjectDeletion;
    now(): Date;
  }>,
  input: Readonly<{ userId: string; attemptId: string }>,
): Promise<
  Readonly<{
    found: boolean;
    deleted: boolean;
    cleanupPending: boolean;
  }>
> {
  const now = dependencies.now();
  const attempt = await dependencies.repository.discardOwnedAttempt(
    input.userId,
    input.attemptId,
    now,
  );
  if (!attempt) return { found: false, deleted: false, cleanupPending: false };
  if (attempt.status === "deleted") {
    return { found: true, deleted: true, cleanupPending: false };
  }

  try {
    await dependencies.storage.deletePrivateObject(attempt.objectKey);
    await dependencies.repository.markDeleted(attempt.id, dependencies.now());
    return { found: true, deleted: true, cleanupPending: false };
  } catch {
    return { found: true, deleted: false, cleanupPending: true };
  }
}

export async function cleanupSpeakingUploads(
  dependencies: Readonly<{
    repository: DirectSpeakingRepository;
    storage: SpeakingObjectDeletion;
    now(): Date;
  }>,
  limit = 50,
): Promise<
  Readonly<{
    selected: number;
    deleted: number;
    failed: number;
  }>
> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) {
    throw new Error("Speaking cleanup limit must be between 1 and 250");
  }
  const now = dependencies.now();
  const candidates = await dependencies.repository.listCleanupCandidates(
    now,
    limit,
  );
  let deleted = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      await dependencies.storage.deletePrivateObject(candidate.objectKey);
      await dependencies.repository.markDeleted(
        candidate.id,
        dependencies.now(),
      );
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return { selected: candidates.length, deleted, failed };
}

function sameOperation(
  attempt: DirectSpeakingAttempt,
  input: PrepareSpeakingUploadInput,
): boolean {
  return (
    attempt.enrollmentId === input.enrollmentId &&
    attempt.sessionItemId === input.sessionItemId &&
    attempt.activityId === input.activityId &&
    attempt.contentSchemaVersion === input.contentSchemaVersion &&
    attempt.contentRevision === input.contentRevision &&
    attempt.operationKey === input.operationKey &&
    attempt.mimeType === input.mimeType &&
    attempt.byteLength === input.byteLength &&
    attempt.durationMs === input.durationMs
  );
}
