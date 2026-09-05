import { and, asc, eq, inArray, lte, or } from "drizzle-orm";
import type { Database } from "../client.ts";
import { enrollments, languageProfiles } from "../schema.ts";
import { speakingAttempts } from "../speaking-schema.ts";
import { sessionItems, studySessions } from "../study-schema.ts";

export type SpeakingAttemptStatus =
  "reserved" | "uploaded" | "discarded" | "deleted";

export type SpeakingAttemptRecord = Readonly<{
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
  status: SpeakingAttemptStatus;
  etag: string | null;
  uploadExpiresAt: Date;
  uploadedAt: Date | null;
  retainedUntil: Date | null;
  discardedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ReserveSpeakingAttemptInput = Readonly<{
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
}>;

export type ReserveSpeakingAttemptResult = Readonly<{
  inserted: boolean;
  attempt: SpeakingAttemptRecord;
}>;

function fromRow(
  row: typeof speakingAttempts.$inferSelect,
): SpeakingAttemptRecord {
  return {
    ...row,
    status: row.status as SpeakingAttemptStatus,
  };
}

export class PostgresSpeakingRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async ownsLessonSessionItem(
    input: Readonly<{
      userId: string;
      enrollmentId: string;
      sessionItemId: string;
      lessonId: string;
    }>,
  ): Promise<boolean> {
    const [row] = await this.database
      .select({ id: sessionItems.id })
      .from(sessionItems)
      .innerJoin(
        studySessions,
        eq(studySessions.id, sessionItems.studySessionId),
      )
      .innerJoin(enrollments, eq(enrollments.id, studySessions.enrollmentId))
      .innerJoin(
        languageProfiles,
        eq(languageProfiles.id, enrollments.languageProfileId),
      )
      .where(
        and(
          eq(languageProfiles.userId, input.userId),
          eq(enrollments.id, input.enrollmentId),
          eq(sessionItems.id, input.sessionItemId),
          eq(sessionItems.kind, "lesson"),
          eq(sessionItems.resourceId, input.lessonId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async reserveAttempt(
    input: ReserveSpeakingAttemptInput,
  ): Promise<ReserveSpeakingAttemptResult> {
    const inserted = await this.database
      .insert(speakingAttempts)
      .values({
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
        status: "reserved",
        uploadExpiresAt: input.uploadExpiresAt,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoNothing({
        target: [speakingAttempts.enrollmentId, speakingAttempts.operationKey],
      })
      .returning();

    if (inserted[0]) {
      return { inserted: true, attempt: fromRow(inserted[0]) };
    }

    const [existing] = await this.database
      .select()
      .from(speakingAttempts)
      .where(
        and(
          eq(speakingAttempts.enrollmentId, input.enrollmentId),
          eq(speakingAttempts.operationKey, input.operationKey),
        ),
      )
      .limit(1);
    if (!existing) {
      throw new Error("Speaking attempt conflict could not be reloaded");
    }
    return { inserted: false, attempt: fromRow(existing) };
  }

  async findOwnedAttempt(
    userId: string,
    attemptId: string,
  ): Promise<SpeakingAttemptRecord | null> {
    const [row] = await this.database
      .select({ attempt: speakingAttempts })
      .from(speakingAttempts)
      .innerJoin(enrollments, eq(enrollments.id, speakingAttempts.enrollmentId))
      .innerJoin(
        languageProfiles,
        eq(languageProfiles.id, enrollments.languageProfileId),
      )
      .where(
        and(
          eq(languageProfiles.userId, userId),
          eq(speakingAttempts.id, attemptId),
        ),
      )
      .limit(1);
    return row ? fromRow(row.attempt) : null;
  }

  async findByObjectKey(
    objectKey: string,
  ): Promise<SpeakingAttemptRecord | null> {
    const [row] = await this.database
      .select()
      .from(speakingAttempts)
      .where(eq(speakingAttempts.objectKey, objectKey))
      .limit(1);
    return row ? fromRow(row) : null;
  }

  async refreshUploadWindow(
    userId: string,
    attemptId: string,
    uploadExpiresAt: Date,
    now: Date,
  ): Promise<SpeakingAttemptRecord | null> {
    const owned = await this.findOwnedAttempt(userId, attemptId);
    if (!owned || owned.status !== "reserved") return owned;

    const [row] = await this.database
      .update(speakingAttempts)
      .set({ uploadExpiresAt, updatedAt: now })
      .where(
        and(
          eq(speakingAttempts.id, attemptId),
          eq(speakingAttempts.status, "reserved"),
        ),
      )
      .returning();
    return row ? fromRow(row) : this.findOwnedAttempt(userId, attemptId);
  }

  async markUploaded(
    input: Readonly<{
      attemptId: string;
      etag: string;
      uploadedAt: Date;
      retainedUntil: Date;
      now: Date;
    }>,
  ): Promise<SpeakingAttemptRecord | null> {
    const [row] = await this.database
      .update(speakingAttempts)
      .set({
        status: "uploaded",
        etag: input.etag,
        uploadedAt: input.uploadedAt,
        retainedUntil: input.retainedUntil,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(speakingAttempts.id, input.attemptId),
          eq(speakingAttempts.status, "reserved"),
        ),
      )
      .returning();
    if (row) return fromRow(row);

    const [existing] = await this.database
      .select()
      .from(speakingAttempts)
      .where(eq(speakingAttempts.id, input.attemptId))
      .limit(1);
    return existing ? fromRow(existing) : null;
  }

  async discardOwnedAttempt(
    userId: string,
    attemptId: string,
    now: Date,
  ): Promise<SpeakingAttemptRecord | null> {
    const owned = await this.findOwnedAttempt(userId, attemptId);
    if (!owned) return null;
    if (owned.status === "discarded" || owned.status === "deleted")
      return owned;

    const [row] = await this.database
      .update(speakingAttempts)
      .set({ status: "discarded", discardedAt: now, updatedAt: now })
      .where(
        and(
          eq(speakingAttempts.id, attemptId),
          inArray(speakingAttempts.status, ["reserved", "uploaded"]),
        ),
      )
      .returning();
    return row ? fromRow(row) : this.findOwnedAttempt(userId, attemptId);
  }

  async listCleanupCandidates(
    now: Date,
    limit: number,
  ): Promise<readonly SpeakingAttemptRecord[]> {
    const rows = await this.database
      .select()
      .from(speakingAttempts)
      .where(
        or(
          eq(speakingAttempts.status, "discarded"),
          and(
            eq(speakingAttempts.status, "reserved"),
            lte(speakingAttempts.uploadExpiresAt, now),
          ),
          and(
            eq(speakingAttempts.status, "uploaded"),
            lte(speakingAttempts.retainedUntil, now),
          ),
        ),
      )
      .orderBy(asc(speakingAttempts.updatedAt), asc(speakingAttempts.id))
      .limit(limit);
    return rows.map(fromRow);
  }

  async markDeleted(
    attemptId: string,
    now: Date,
  ): Promise<SpeakingAttemptRecord | null> {
    const [row] = await this.database
      .update(speakingAttempts)
      .set({ status: "deleted", deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(speakingAttempts.id, attemptId),
          inArray(speakingAttempts.status, [
            "reserved",
            "uploaded",
            "discarded",
          ]),
        ),
      )
      .returning();
    if (row) return fromRow(row);

    const [existing] = await this.database
      .select()
      .from(speakingAttempts)
      .where(eq(speakingAttempts.id, attemptId))
      .limit(1);
    return existing ? fromRow(existing) : null;
  }
}
