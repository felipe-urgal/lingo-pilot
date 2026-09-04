import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  SessionExecutionRepository,
  SessionItem,
  SessionReviewResource,
  SkipSessionItemResult,
  StudySession,
} from "../../../domain/src/index.ts";
import type { Database, DatabaseTransaction } from "../client.ts";
import { memoryItems } from "../practice-schema.ts";
import { sessionItems, studySessions } from "../study-schema.ts";

type Queryable = Database | DatabaseTransaction;

function itemFromRow(row: typeof sessionItems.$inferSelect): SessionItem {
  return {
    id: row.id,
    studySessionId: row.studySessionId,
    position: row.position,
    kind: row.kind as SessionItem["kind"],
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

async function findOwnedSession(
  database: Queryable,
  enrollmentId: string,
  sessionId: string,
) {
  const [row] = await database
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.enrollmentId, enrollmentId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function finalizeSession(
  database: DatabaseTransaction,
  enrollmentId: string,
  sessionId: string,
  now: Date,
): Promise<StudySession | null> {
  const session = await findOwnedSession(database, enrollmentId, sessionId);
  if (!session) return null;
  if (session.status === "abandoned") return loadSession(database, session);

  const [remaining] = await database
    .select({ id: sessionItems.id })
    .from(sessionItems)
    .where(
      and(
        eq(sessionItems.studySessionId, sessionId),
        inArray(sessionItems.status, ["planned", "in_progress"]),
      ),
    )
    .limit(1);

  if (!remaining && session.status !== "completed") {
    const [updated] = await database
      .update(studySessions)
      .set({
        status: "completed",
        startedAt: sql`coalesce(${studySessions.startedAt}, ${now})`,
        completedAt: sql`coalesce(${studySessions.completedAt}, ${now})`,
        updatedAt: now,
      })
      .where(
        and(
          eq(studySessions.id, sessionId),
          eq(studySessions.enrollmentId, enrollmentId),
        ),
      )
      .returning();
    return updated ? loadSession(database, updated) : null;
  }

  return loadSession(database, session);
}

export class PostgresSessionExecutionRepository implements SessionExecutionRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async findLatestOpenSession(
    enrollmentId: string,
  ): Promise<StudySession | null> {
    const [row] = await this.database
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.enrollmentId, enrollmentId),
          inArray(studySessions.status, ["planned", "in_progress"]),
        ),
      )
      .orderBy(
        desc(studySessions.localStudyDate),
        desc(studySessions.createdAt),
      )
      .limit(1);
    return row ? loadSession(this.database, row) : null;
  }

  async findReviewResource(
    enrollmentId: string,
    memoryItemId: string,
  ): Promise<SessionReviewResource | null> {
    const [row] = await this.database
      .select({
        id: memoryItems.id,
        sourceActivityId: memoryItems.sourceActivityId,
        dueAt: memoryItems.dueAt,
      })
      .from(memoryItems)
      .where(
        and(
          eq(memoryItems.id, memoryItemId),
          eq(memoryItems.enrollmentId, enrollmentId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async skipSessionItem(input: {
    readonly enrollmentId: string;
    readonly sessionId: string;
    readonly itemId: string;
    readonly now: Date;
  }): Promise<SkipSessionItemResult> {
    return this.database.transaction(async (transaction) => {
      const [owned] = await transaction
        .select({ item: sessionItems, session: studySessions })
        .from(sessionItems)
        .innerJoin(
          studySessions,
          eq(studySessions.id, sessionItems.studySessionId),
        )
        .where(
          and(
            eq(sessionItems.id, input.itemId),
            eq(sessionItems.studySessionId, input.sessionId),
            eq(studySessions.enrollmentId, input.enrollmentId),
          ),
        )
        .limit(1);

      if (!owned) return { ok: false, reason: "not-found" } as const;
      if (owned.item.status === "skipped") {
        const session = await loadSession(transaction, owned.session);
        return { ok: true, session, duplicate: true } as const;
      }
      if (
        owned.item.status === "completed" ||
        owned.session.status === "completed" ||
        owned.session.status === "abandoned"
      ) {
        return { ok: false, reason: "invalid-state" } as const;
      }

      await transaction
        .update(sessionItems)
        .set({ status: "skipped", updatedAt: input.now })
        .where(eq(sessionItems.id, input.itemId));
      await transaction
        .update(studySessions)
        .set({
          status: "in_progress",
          startedAt: sql`coalesce(${studySessions.startedAt}, ${input.now})`,
          updatedAt: input.now,
        })
        .where(eq(studySessions.id, input.sessionId));

      const session = await finalizeSession(
        transaction,
        input.enrollmentId,
        input.sessionId,
        input.now,
      );
      if (!session) return { ok: false, reason: "not-found" } as const;
      return { ok: true, session, duplicate: false } as const;
    });
  }

  async finalizeSessionIfTerminal(input: {
    readonly enrollmentId: string;
    readonly sessionId: string;
    readonly now: Date;
  }): Promise<StudySession | null> {
    return this.database.transaction((transaction) =>
      finalizeSession(
        transaction,
        input.enrollmentId,
        input.sessionId,
        input.now,
      ),
    );
  }

  async finalizeSessionContainingItem(input: {
    readonly enrollmentId: string;
    readonly itemId: string;
    readonly now: Date;
  }): Promise<StudySession | null> {
    return this.database.transaction(async (transaction) => {
      const [owned] = await transaction
        .select({ sessionId: studySessions.id })
        .from(sessionItems)
        .innerJoin(
          studySessions,
          eq(studySessions.id, sessionItems.studySessionId),
        )
        .where(
          and(
            eq(sessionItems.id, input.itemId),
            eq(studySessions.enrollmentId, input.enrollmentId),
          ),
        )
        .limit(1);
      if (!owned) return null;
      return finalizeSession(
        transaction,
        input.enrollmentId,
        owned.sessionId,
        input.now,
      );
    });
  }
}
