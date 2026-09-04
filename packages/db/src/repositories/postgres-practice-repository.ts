import { and, asc, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import type {
  ActivityAttempt,
  ConceptEvidence,
  DueReviewItem,
  MasteryReducer,
  MasteryState,
  PersistedActivityAnswer,
  PracticeRepository,
  RecordReviewInput,
  RecordReviewResult,
  ReviewEvent,
  SubmitAttemptInput,
  SubmitAttemptResult,
} from "../../../domain/src/index.ts";
import type { Database, DatabaseTransaction } from "../client.ts";
import {
  activityAttempts,
  activityProgress,
  conceptEvidence,
  masteryStates,
  memoryItems,
  reviewEvents,
} from "../practice-schema.ts";
import { sessionItems, studySessions } from "../study-schema.ts";

type Queryable = Database | DatabaseTransaction;

function attemptFromRow(
  row: typeof activityAttempts.$inferSelect,
): ActivityAttempt {
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    sessionItemId: row.sessionItemId,
    activityId: row.activityId,
    schemaVersion: row.contentSchemaVersion,
    revision: row.contentRevision,
    operationKey: row.operationKey,
    answer: row.answer as PersistedActivityAnswer,
    evaluation: {
      source: "deterministic/rule",
      correct: row.correct,
      scorePercent: row.scorePercent,
    },
    hintCount: row.hintCount,
    modality: row.modality as ActivityAttempt["modality"],
    createdAt: row.createdAt,
  };
}

function evidenceFromRow(
  row: typeof conceptEvidence.$inferSelect,
): ConceptEvidence {
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    conceptId: row.conceptId,
    sourceType: row.sourceType as ConceptEvidence["sourceType"],
    sourceId: row.sourceId,
    kind: row.kind as ConceptEvidence["kind"],
    modality: row.modality as ConceptEvidence["modality"],
    outcome: row.outcome as ConceptEvidence["outcome"],
    supportLevel: row.supportLevel,
    occurredAt: row.occurredAt,
  };
}

function masteryFromRow(row: typeof masteryStates.$inferSelect): MasteryState {
  return {
    enrollmentId: row.enrollmentId,
    conceptId: row.conceptId,
    scorePercent: row.scorePercent,
    confidencePercent: row.confidencePercent,
    algorithmVersion: row.algorithmVersion,
    updatedAt: row.updatedAt,
  };
}

function reviewFromRow(row: typeof reviewEvents.$inferSelect): ReviewEvent {
  return {
    id: row.id,
    memoryItemId: row.memoryItemId,
    enrollmentId: row.enrollmentId,
    operationKey: row.operationKey,
    grade: row.grade as ReviewEvent["grade"],
    correct: row.correct,
    hintCount: row.hintCount,
    previousDueAt: row.previousDueAt,
    nextDueAt: row.nextDueAt,
    intervalSeconds: row.intervalSeconds,
    algorithmVersion: row.algorithmVersion,
    createdAt: row.createdAt,
  };
}

async function findAttemptByOperation(
  database: Queryable,
  enrollmentId: string,
  operationKey: string,
) {
  const [row] = await database
    .select()
    .from(activityAttempts)
    .where(
      and(
        eq(activityAttempts.enrollmentId, enrollmentId),
        eq(activityAttempts.operationKey, operationKey),
      ),
    )
    .limit(1);
  return row;
}

async function findReviewByOperation(
  database: Queryable,
  enrollmentId: string,
  operationKey: string,
) {
  const [row] = await database
    .select()
    .from(reviewEvents)
    .where(
      and(
        eq(reviewEvents.enrollmentId, enrollmentId),
        eq(reviewEvents.operationKey, operationKey),
      ),
    )
    .limit(1);
  return row;
}

async function ownsSessionItem(
  database: Queryable,
  enrollmentId: string,
  sessionItemId: string,
): Promise<boolean> {
  const [row] = await database
    .select({ id: sessionItems.id })
    .from(sessionItems)
    .innerJoin(studySessions, eq(studySessions.id, sessionItems.studySessionId))
    .where(
      and(
        eq(sessionItems.id, sessionItemId),
        eq(studySessions.enrollmentId, enrollmentId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function findOwnedPlannedReview(
  database: Queryable,
  input: Pick<RecordReviewInput, "enrollmentId" | "memoryItemId" | "sessionItemId">,
) {
  if (!input.sessionItemId) return null;
  const [row] = await database
    .select({ item: sessionItems, session: studySessions })
    .from(sessionItems)
    .innerJoin(studySessions, eq(studySessions.id, sessionItems.studySessionId))
    .where(
      and(
        eq(sessionItems.id, input.sessionItemId),
        eq(sessionItems.kind, "review"),
        eq(sessionItems.resourceId, input.memoryItemId),
        eq(studySessions.enrollmentId, input.enrollmentId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function completePlannedReview(
  transaction: DatabaseTransaction,
  input: RecordReviewInput,
): Promise<void> {
  if (!input.sessionItemId) return;
  const owned = await findOwnedPlannedReview(transaction, input);
  if (!owned) throw new Error("Planned review ownership changed during submit");

  await transaction
    .update(sessionItems)
    .set({ status: "completed", updatedAt: input.now })
    .where(eq(sessionItems.id, input.sessionItemId));

  const [remaining] = await transaction
    .select({ id: sessionItems.id })
    .from(sessionItems)
    .where(
      and(
        eq(sessionItems.studySessionId, owned.session.id),
        ne(sessionItems.status, "completed"),
      ),
    )
    .limit(1);
  await transaction
    .update(studySessions)
    .set({
      status: remaining ? "in_progress" : "completed",
      startedAt: sql`coalesce(${studySessions.startedAt}, ${input.now})`,
      completedAt: remaining ? null : input.now,
      updatedAt: input.now,
    })
    .where(eq(studySessions.id, owned.session.id));
}

async function evidenceForConcept(
  database: Queryable,
  enrollmentId: string,
  conceptId: string,
): Promise<readonly ConceptEvidence[]> {
  const rows = await database
    .select()
    .from(conceptEvidence)
    .where(
      and(
        eq(conceptEvidence.enrollmentId, enrollmentId),
        eq(conceptEvidence.conceptId, conceptId),
      ),
    )
    .orderBy(asc(conceptEvidence.occurredAt), asc(conceptEvidence.id));
  return rows.map(evidenceFromRow);
}

async function recomputeMastery(
  database: DatabaseTransaction,
  enrollmentId: string,
  conceptId: string,
  now: Date,
  reduceMastery: MasteryReducer,
): Promise<void> {
  const projection = reduceMastery(
    await evidenceForConcept(database, enrollmentId, conceptId),
  );
  await database
    .insert(masteryStates)
    .values({
      enrollmentId,
      conceptId,
      scorePercent: projection.scorePercent,
      confidencePercent: projection.confidencePercent,
      algorithmVersion: projection.algorithmVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [masteryStates.enrollmentId, masteryStates.conceptId],
      set: {
        scorePercent: projection.scorePercent,
        confidencePercent: projection.confidencePercent,
        algorithmVersion: projection.algorithmVersion,
        updatedAt: now,
      },
    });
}

export class PostgresPracticeRepository implements PracticeRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async findAttemptByOperation(
    enrollmentId: string,
    operationKey: string,
  ): Promise<ActivityAttempt | null> {
    const row = await findAttemptByOperation(
      this.database,
      enrollmentId,
      operationKey,
    );
    return row ? attemptFromRow(row) : null;
  }

  async submitAttempt(
    input: SubmitAttemptInput,
    reduceMastery: MasteryReducer,
  ): Promise<SubmitAttemptResult> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${input.enrollmentId}), hashtext(${input.activityId}))`,
      );

      const duplicate = await findAttemptByOperation(
        transaction,
        input.enrollmentId,
        input.operationKey,
      );
      if (duplicate) {
        return {
          ok: true,
          attempt: attemptFromRow(duplicate),
          duplicate: true,
        };
      }

      if (
        input.sessionItemId &&
        !(await ownsSessionItem(
          transaction,
          input.enrollmentId,
          input.sessionItemId,
        ))
      ) {
        return { ok: false, reason: "not-found" };
      }

      const maxAttempts = Math.max(1, Math.trunc(input.maxAttempts));
      const [progress] = await transaction
        .select({ attempts: activityProgress.attempts })
        .from(activityProgress)
        .where(
          and(
            eq(activityProgress.enrollmentId, input.enrollmentId),
            eq(activityProgress.activityId, input.activityId),
          ),
        )
        .limit(1);
      if ((progress?.attempts ?? 0) >= maxAttempts) {
        return { ok: false, reason: "retry-limit" };
      }

      const [created] = await transaction
        .insert(activityAttempts)
        .values({
          id: input.attemptId,
          enrollmentId: input.enrollmentId,
          sessionItemId: input.sessionItemId,
          activityId: input.activityId,
          contentSchemaVersion: input.contentSchemaVersion,
          contentRevision: input.contentRevision,
          operationKey: input.operationKey,
          answer: input.answer,
          evaluationSource: "deterministic/rule",
          correct: input.correct,
          scorePercent: input.scorePercent,
          hintCount: input.hintCount,
          modality: input.modality,
          createdAt: input.now,
        })
        .onConflictDoNothing({
          target: [
            activityAttempts.enrollmentId,
            activityAttempts.operationKey,
          ],
        })
        .returning();

      if (!created) {
        const raced = await findAttemptByOperation(
          transaction,
          input.enrollmentId,
          input.operationKey,
        );
        if (!raced) throw new Error("Attempt idempotency conflict lost");
        return { ok: true, attempt: attemptFromRow(raced), duplicate: true };
      }

      await transaction
        .insert(activityProgress)
        .values({
          enrollmentId: input.enrollmentId,
          activityId: input.activityId,
          attempts: 1,
          correctAttempts: input.correct ? 1 : 0,
          lastAttemptAt: input.now,
        })
        .onConflictDoUpdate({
          target: [activityProgress.enrollmentId, activityProgress.activityId],
          set: {
            attempts: sql`${activityProgress.attempts} + 1`,
            correctAttempts: sql`${activityProgress.correctAttempts} + ${input.correct ? 1 : 0}`,
            lastAttemptAt: input.now,
          },
        });

      for (const conceptId of new Set(input.conceptIds)) {
        const schedule = input.initialMemorySchedules.find(
          (candidate) => candidate.conceptId === conceptId,
        );
        if (!schedule)
          throw new Error(`Missing memory schedule for ${conceptId}`);

        await transaction
          .insert(memoryItems)
          .values({
            id: schedule.memoryItemId,
            enrollmentId: input.enrollmentId,
            conceptId,
            sourceActivityId: input.activityId,
            dueAt: schedule.dueAt,
            intervalSeconds: schedule.intervalSeconds,
            reviewCount: 0,
            algorithmVersion: schedule.algorithmVersion,
            updatedAt: input.now,
          })
          .onConflictDoNothing({
            target: [memoryItems.enrollmentId, memoryItems.conceptId],
          });

        await transaction.insert(conceptEvidence).values({
          id: `${input.attemptId}.${conceptId}`,
          enrollmentId: input.enrollmentId,
          conceptId,
          sourceType: "attempt",
          sourceId: input.attemptId,
          kind: input.evidenceKind,
          modality: input.modality,
          outcome: input.correct ? "correct" : "incorrect",
          supportLevel: input.supportLevel,
          occurredAt: input.now,
        });
        await recomputeMastery(
          transaction,
          input.enrollmentId,
          conceptId,
          input.now,
          reduceMastery,
        );
      }

      return { ok: true, attempt: attemptFromRow(created), duplicate: false };
    });
  }

  async listDueReviewItems(
    enrollmentId: string,
    now: Date,
    limit: number,
    offset = 0,
  ): Promise<readonly DueReviewItem[]> {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
    const safeOffset = Math.max(0, Math.trunc(offset));
    const rows = await this.database
      .select({ memory: memoryItems, mastery: masteryStates })
      .from(memoryItems)
      .leftJoin(
        masteryStates,
        and(
          eq(masteryStates.enrollmentId, memoryItems.enrollmentId),
          eq(masteryStates.conceptId, memoryItems.conceptId),
        ),
      )
      .where(
        and(
          eq(memoryItems.enrollmentId, enrollmentId),
          lte(memoryItems.dueAt, now),
        ),
      )
      .orderBy(asc(memoryItems.dueAt), asc(memoryItems.id))
      .limit(safeLimit)
      .offset(safeOffset);

    return rows.map(({ memory, mastery }) => ({
      id: memory.id,
      enrollmentId: memory.enrollmentId,
      conceptId: memory.conceptId,
      sourceActivityId: memory.sourceActivityId,
      dueAt: memory.dueAt,
      intervalSeconds: memory.intervalSeconds,
      reviewCount: memory.reviewCount,
      algorithmVersion: memory.algorithmVersion,
      updatedAt: memory.updatedAt,
      mastery: mastery ? masteryFromRow(mastery) : null,
    }));
  }

  async countDueReviewItems(enrollmentId: string, now: Date): Promise<number> {
    const [row] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(memoryItems)
      .where(
        and(
          eq(memoryItems.enrollmentId, enrollmentId),
          lte(memoryItems.dueAt, now),
        ),
      );
    return row?.count ?? 0;
  }

  async findReviewByOperation(
    enrollmentId: string,
    operationKey: string,
  ): Promise<ReviewEvent | null> {
    const row = await findReviewByOperation(
      this.database,
      enrollmentId,
      operationKey,
    );
    return row ? reviewFromRow(row) : null;
  }

  async recordReview(
    input: RecordReviewInput,
    reduceMastery: MasteryReducer,
  ): Promise<RecordReviewResult> {
    return this.database.transaction(async (transaction) => {
      const duplicate = await findReviewByOperation(
        transaction,
        input.enrollmentId,
        input.operationKey,
      );
      if (duplicate) {
        return { ok: true, event: reviewFromRow(duplicate), duplicate: true };
      }

      if (input.sessionItemId) {
        const planned = await findOwnedPlannedReview(transaction, input);
        if (
          !planned ||
          planned.item.status === "completed" ||
          planned.session.status === "completed" ||
          planned.session.status === "abandoned"
        ) {
          return { ok: false, reason: "not-found" };
        }
      }

      const [memory] = await transaction
        .select()
        .from(memoryItems)
        .where(
          and(
            eq(memoryItems.id, input.memoryItemId),
            eq(memoryItems.enrollmentId, input.enrollmentId),
          ),
        )
        .limit(1);
      if (!memory) return { ok: false, reason: "not-found" };
      if (memory.reviewCount !== input.expectedReviewCount) {
        return { ok: false, reason: "stale-review" };
      }

      const [updated] = await transaction
        .update(memoryItems)
        .set({
          dueAt: input.nextDueAt,
          intervalSeconds: input.intervalSeconds,
          reviewCount: input.expectedReviewCount + 1,
          algorithmVersion: input.algorithmVersion,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(memoryItems.id, input.memoryItemId),
            eq(memoryItems.enrollmentId, input.enrollmentId),
            eq(memoryItems.reviewCount, input.expectedReviewCount),
          ),
        )
        .returning();
      if (!updated) return { ok: false, reason: "stale-review" };

      const [event] = await transaction
        .insert(reviewEvents)
        .values({
          id: input.reviewEventId,
          memoryItemId: input.memoryItemId,
          enrollmentId: input.enrollmentId,
          operationKey: input.operationKey,
          grade: input.grade,
          correct: input.correct,
          hintCount: input.hintCount,
          previousDueAt: memory.dueAt,
          nextDueAt: input.nextDueAt,
          intervalSeconds: input.intervalSeconds,
          algorithmVersion: input.algorithmVersion,
          createdAt: input.now,
        })
        .returning();
      if (!event) throw new Error("Review event insert did not return a row");

      await transaction.insert(conceptEvidence).values({
        id: `${input.reviewEventId}.${memory.conceptId}`,
        enrollmentId: input.enrollmentId,
        conceptId: memory.conceptId,
        sourceType: "review",
        sourceId: input.reviewEventId,
        kind: "delayed-review",
        modality: input.modality,
        outcome: input.correct ? "correct" : "incorrect",
        supportLevel: input.supportLevel,
        occurredAt: input.now,
      });
      await recomputeMastery(
        transaction,
        input.enrollmentId,
        memory.conceptId,
        input.now,
        reduceMastery,
      );
      await completePlannedReview(transaction, input);

      return { ok: true, event: reviewFromRow(event), duplicate: false };
    });
  }

  listConceptEvidence(
    enrollmentId: string,
    conceptId: string,
  ): Promise<readonly ConceptEvidence[]> {
    return evidenceForConcept(this.database, enrollmentId, conceptId);
  }

  async listWeakConcepts(
    enrollmentId: string,
    limit: number,
  ): Promise<readonly MasteryState[]> {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
    const rows = await this.database
      .select()
      .from(masteryStates)
      .where(
        and(
          eq(masteryStates.enrollmentId, enrollmentId),
          lt(masteryStates.scorePercent, 60),
          gte(masteryStates.confidencePercent, 20),
        ),
      )
      .orderBy(
        asc(masteryStates.scorePercent),
        desc(masteryStates.confidencePercent),
        asc(masteryStates.conceptId),
      )
      .limit(safeLimit);
    return rows.map(masteryFromRow);
  }
}
