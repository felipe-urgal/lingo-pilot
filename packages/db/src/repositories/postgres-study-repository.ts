import { and, asc, eq, ne, sql } from "drizzle-orm";
import type {
  CompleteLessonInput,
  EnsureDailySessionInput,
  LessonProgress,
  SaveLessonPositionInput,
  SessionItem,
  StartSessionItemInput,
  StudyMutationFailure,
  StudyMutationResult,
  StudyRepository,
  StudySession,
} from "../../../domain/src/index.ts";
import type { Database, DatabaseTransaction } from "../client.ts";
import {
  lessonProgress,
  sessionItems,
  studySessions,
} from "../study-schema.ts";

type Queryable = Database | DatabaseTransaction;

function progressFromRow(
  row: typeof lessonProgress.$inferSelect,
): LessonProgress {
  return {
    enrollmentId: row.enrollmentId,
    lessonId: row.lessonId,
    schemaVersion: row.contentSchemaVersion,
    revision: row.contentRevision,
    status: row.status as LessonProgress["status"],
    currentBlockIndex: row.currentBlockIndex,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt,
  };
}

function itemFromRow(row: typeof sessionItems.$inferSelect): SessionItem {
  return {
    id: row.id,
    studySessionId: row.studySessionId,
    position: row.position,
    kind: "lesson",
    resourceId: row.resourceId,
    schemaVersion: row.contentSchemaVersion,
    revision: row.contentRevision,
    reasonCode: row.reasonCode as SessionItem["reasonCode"],
    eligibilityReason:
      row.eligibilityReason as SessionItem["eligibilityReason"],
    estimatedMinutes: row.estimatedMinutes,
    status: row.status as SessionItem["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadSession(
  database: Queryable,
  row: typeof studySessions.$inferSelect,
): Promise<StudySession> {
  const items = await database
    .select()
    .from(sessionItems)
    .where(eq(sessionItems.studySessionId, row.id))
    .orderBy(asc(sessionItems.position));

  return {
    ...row,
    status: row.status as StudySession["status"],
    items: items.map(itemFromRow),
  };
}

async function findProgress(
  database: Queryable,
  enrollmentId: string,
  lessonId: string,
) {
  const [row] = await database
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.enrollmentId, enrollmentId),
        eq(lessonProgress.lessonId, lessonId),
      ),
    )
    .limit(1);
  return row;
}

async function mutationFailure(
  database: Queryable,
  enrollmentId: string,
  lessonId: string,
  schemaVersion: number,
  revision: number,
): Promise<StudyMutationFailure> {
  const row = await findProgress(database, enrollmentId, lessonId);
  if (!row) return "not-found";
  if (
    row.contentSchemaVersion !== schemaVersion ||
    row.contentRevision !== revision
  ) {
    return "revision-conflict";
  }
  return "invalid-state";
}

async function findOwnedItem(
  database: Queryable,
  enrollmentId: string,
  itemId: string,
) {
  const [row] = await database
    .select({ item: sessionItems, session: studySessions })
    .from(sessionItems)
    .innerJoin(
      studySessions,
      eq(studySessions.id, sessionItems.studySessionId),
    )
    .where(
      and(
        eq(sessionItems.id, itemId),
        eq(studySessions.enrollmentId, enrollmentId),
      ),
    )
    .limit(1);
  return row;
}

export class PostgresStudyRepository implements StudyRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async listLessonProgress(
    enrollmentId: string,
  ): Promise<readonly LessonProgress[]> {
    const rows = await this.database
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.enrollmentId, enrollmentId));
    return rows.map(progressFromRow);
  }

  async findDailySession(
    enrollmentId: string,
    localStudyDate: string,
  ): Promise<StudySession | null> {
    const [row] = await this.database
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.enrollmentId, enrollmentId),
          eq(studySessions.localStudyDate, localStudyDate),
        ),
      )
      .limit(1);
    return row ? loadSession(this.database, row) : null;
  }

  async findSession(
    enrollmentId: string,
    sessionId: string,
  ): Promise<StudySession | null> {
    const [row] = await this.database
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.enrollmentId, enrollmentId),
          eq(studySessions.id, sessionId),
        ),
      )
      .limit(1);
    return row ? loadSession(this.database, row) : null;
  }

  async findSessionItem(
    enrollmentId: string,
    itemId: string,
  ): Promise<SessionItem | null> {
    const row = await findOwnedItem(this.database, enrollmentId, itemId);
    return row ? itemFromRow(row.item) : null;
  }

  async ensureDailySession(
    input: EnsureDailySessionInput,
  ): Promise<StudySession> {
    return this.database.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(studySessions)
        .values({
          id: input.sessionId,
          enrollmentId: input.enrollmentId,
          localStudyDate: input.localStudyDate,
          plannerVersion: input.plannerVersion,
          status: "planned",
          createdAt: input.now,
          startedAt: null,
          completedAt: null,
          updatedAt: input.now,
        })
        .onConflictDoNothing({
          target: [studySessions.enrollmentId, studySessions.localStudyDate],
        })
        .returning();

      if (created) {
        await transaction.insert(sessionItems).values({
          id: input.itemId,
          studySessionId: created.id,
          position: 0,
          kind: "lesson",
          resourceId: input.lessonId,
          contentSchemaVersion: input.contentSchemaVersion,
          contentRevision: input.contentRevision,
          reasonCode:
            input.eligibilityReason === "resume-in-progress"
              ? "RESUME_IN_PROGRESS"
              : "NEW_ELIGIBLE_LESSON",
          eligibilityReason: input.eligibilityReason,
          estimatedMinutes: input.estimatedMinutes,
          status: "planned",
          createdAt: input.now,
          updatedAt: input.now,
        });
        return loadSession(transaction, created);
      }

      const [existing] = await transaction
        .select()
        .from(studySessions)
        .where(
          and(
            eq(studySessions.enrollmentId, input.enrollmentId),
            eq(studySessions.localStudyDate, input.localStudyDate),
          ),
        )
        .limit(1);
      if (!existing) throw new Error("Daily study session conflict lost");
      return loadSession(transaction, existing);
    });
  }

  async startSessionItem(
    input: StartSessionItemInput,
  ): Promise<StudyMutationResult<LessonProgress>> {
    return this.database.transaction(async (transaction) => {
      const owned = await findOwnedItem(
        transaction,
        input.enrollmentId,
        input.itemId,
      );
      if (
        !owned ||
        owned.session.id !== input.sessionId ||
        owned.item.resourceId !== input.lessonId
      ) {
        return { ok: false, reason: "not-found" };
      }
      if (
        owned.session.status === "completed" ||
        owned.session.status === "abandoned" ||
        owned.item.status === "completed"
      ) {
        return { ok: false, reason: "invalid-state" };
      }
      if (
        owned.item.contentSchemaVersion !== input.contentSchemaVersion ||
        owned.item.contentRevision !== input.contentRevision
      ) {
        return { ok: false, reason: "revision-conflict" };
      }

      await transaction
        .insert(lessonProgress)
        .values({
          enrollmentId: input.enrollmentId,
          lessonId: input.lessonId,
          contentSchemaVersion: input.contentSchemaVersion,
          contentRevision: input.contentRevision,
          status: "in_progress",
          currentBlockIndex: 0,
          startedAt: input.now,
          completedAt: null,
          updatedAt: input.now,
        })
        .onConflictDoNothing({
          target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
        });

      const progress = await findProgress(
        transaction,
        input.enrollmentId,
        input.lessonId,
      );
      if (!progress) return { ok: false, reason: "not-found" };
      if (
        progress.contentSchemaVersion !== input.contentSchemaVersion ||
        progress.contentRevision !== input.contentRevision
      ) {
        return { ok: false, reason: "revision-conflict" };
      }
      if (progress.status === "completed") {
        return { ok: false, reason: "invalid-state" };
      }

      await transaction
        .update(studySessions)
        .set({
          status: "in_progress",
          startedAt: sql`coalesce(${studySessions.startedAt}, ${input.now})`,
          updatedAt: input.now,
        })
        .where(eq(studySessions.id, input.sessionId));
      await transaction
        .update(sessionItems)
        .set({ status: "in_progress", updatedAt: input.now })
        .where(eq(sessionItems.id, input.itemId));

      return { ok: true, value: progressFromRow(progress) };
    });
  }

  async saveLessonPosition(
    input: SaveLessonPositionInput,
  ): Promise<StudyMutationResult<LessonProgress>> {
    const [saved] = await this.database
      .update(lessonProgress)
      .set({
        currentBlockIndex: input.currentBlockIndex,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(lessonProgress.enrollmentId, input.enrollmentId),
          eq(lessonProgress.lessonId, input.lessonId),
          eq(lessonProgress.status, "in_progress"),
          eq(lessonProgress.contentSchemaVersion, input.contentSchemaVersion),
          eq(lessonProgress.contentRevision, input.contentRevision),
          eq(lessonProgress.currentBlockIndex, input.expectedBlockIndex),
        ),
      )
      .returning();
    if (saved) return { ok: true, value: progressFromRow(saved) };

    return {
      ok: false,
      reason: await mutationFailure(
        this.database,
        input.enrollmentId,
        input.lessonId,
        input.contentSchemaVersion,
        input.contentRevision,
      ),
    };
  }

  async completeLesson(
    input: CompleteLessonInput,
  ): Promise<StudyMutationResult<StudySession>> {
    return this.database.transaction(async (transaction) => {
      const owned = await findOwnedItem(
        transaction,
        input.enrollmentId,
        input.itemId,
      );
      if (
        !owned ||
        owned.session.id !== input.sessionId ||
        owned.item.resourceId !== input.lessonId
      ) {
        return { ok: false, reason: "not-found" };
      }
      if (
        owned.item.contentSchemaVersion !== input.contentSchemaVersion ||
        owned.item.contentRevision !== input.contentRevision
      ) {
        return { ok: false, reason: "revision-conflict" };
      }

      const progress = await findProgress(
        transaction,
        input.enrollmentId,
        input.lessonId,
      );
      if (!progress) return { ok: false, reason: "not-found" };
      if (
        progress.contentSchemaVersion !== input.contentSchemaVersion ||
        progress.contentRevision !== input.contentRevision
      ) {
        return { ok: false, reason: "revision-conflict" };
      }

      if (progress.status !== "completed") {
        await transaction
          .update(lessonProgress)
          .set({
            status: "completed",
            completedAt: input.now,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(lessonProgress.enrollmentId, input.enrollmentId),
              eq(lessonProgress.lessonId, input.lessonId),
            ),
          );
      }

      await transaction
        .update(sessionItems)
        .set({ status: "completed", updatedAt: input.now })
        .where(eq(sessionItems.id, input.itemId));

      const [remaining] = await transaction
        .select({ id: sessionItems.id })
        .from(sessionItems)
        .where(
          and(
            eq(sessionItems.studySessionId, input.sessionId),
            ne(sessionItems.status, "completed"),
          ),
        )
        .limit(1);
      if (!remaining) {
        await transaction
          .update(studySessions)
          .set({
            status: "completed",
            completedAt: input.now,
            updatedAt: input.now,
          })
          .where(eq(studySessions.id, input.sessionId));
      }

      const [session] = await transaction
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, input.sessionId))
        .limit(1);
      if (!session) return { ok: false, reason: "not-found" };
      return { ok: true, value: await loadSession(transaction, session) };
    });
  }
}
