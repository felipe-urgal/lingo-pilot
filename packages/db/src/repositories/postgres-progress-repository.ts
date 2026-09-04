import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type {
  LessonProgress,
  LoadProgressSnapshotInput,
  MasteryState,
  ProgressModalityEvidenceSummary,
  ProgressRepository,
  SessionItem,
  StudySession,
} from "../../../domain/src/index.ts";
import type { Database } from "../client.ts";
import {
  conceptEvidence,
  masteryStates,
  memoryItems,
} from "../practice-schema.ts";
import {
  lessonProgress,
  sessionItems,
  studySessions,
} from "../study-schema.ts";

const MAX_HISTORY_OFFSET = 1_000;

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

function sessionFromRow(
  row: typeof studySessions.$inferSelect,
  items: readonly SessionItem[],
): StudySession {
  return {
    ...row,
    status: row.status as StudySession["status"],
    items,
  };
}

export class PostgresProgressRepository implements ProgressRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async loadProgressSnapshot(
    input: LoadProgressSnapshotInput,
  ): Promise<Awaited<ReturnType<ProgressRepository["loadProgressSnapshot"]>>> {
    const historyLimit = Math.min(
      20,
      Math.max(1, Math.trunc(input.historyLimit)),
    );
    const historyOffset = Math.min(
      MAX_HISTORY_OFFSET,
      Math.max(0, Math.trunc(input.historyOffset ?? 0)),
    );
    const weakConceptLimit = Math.min(
      20,
      Math.max(1, Math.trunc(input.weakConceptLimit ?? 5)),
    );

    const [
      progressRows,
      masteryAggregate,
      modalityRows,
      weakRows,
      dueAggregate,
      sessionRows,
    ] = await Promise.all([
      this.database
        .select()
        .from(lessonProgress)
        .where(eq(lessonProgress.enrollmentId, input.enrollmentId)),
      this.database
        .select({
          conceptCount: sql<number>`count(*)::int`,
          averageScorePercent: sql<number | null>`round(avg(${masteryStates.scorePercent}))::int`,
          averageConfidencePercent: sql<number | null>`round(avg(${masteryStates.confidencePercent}))::int`,
        })
        .from(masteryStates)
        .where(eq(masteryStates.enrollmentId, input.enrollmentId)),
      this.database
        .select({
          modality: conceptEvidence.modality,
          evidenceCount: sql<number>`count(*)::int`,
          correctCount: sql<number>`count(*) filter (where ${conceptEvidence.outcome} = 'correct')::int`,
        })
        .from(conceptEvidence)
        .where(eq(conceptEvidence.enrollmentId, input.enrollmentId))
        .groupBy(conceptEvidence.modality)
        .orderBy(asc(conceptEvidence.modality)),
      this.database
        .select()
        .from(masteryStates)
        .where(
          and(
            eq(masteryStates.enrollmentId, input.enrollmentId),
            lt(masteryStates.scorePercent, 60),
            gte(masteryStates.confidencePercent, 20),
          ),
        )
        .orderBy(
          asc(masteryStates.scorePercent),
          desc(masteryStates.confidencePercent),
          asc(masteryStates.conceptId),
        )
        .limit(weakConceptLimit),
      this.database
        .select({ count: sql<number>`count(*)::int` })
        .from(memoryItems)
        .where(
          and(
            eq(memoryItems.enrollmentId, input.enrollmentId),
            lte(memoryItems.dueAt, input.now),
          ),
        ),
      this.database
        .select()
        .from(studySessions)
        .where(eq(studySessions.enrollmentId, input.enrollmentId))
        .orderBy(
          desc(studySessions.localStudyDate),
          desc(studySessions.createdAt),
        )
        .limit(historyLimit + 1)
        .offset(historyOffset),
    ]);

    const visibleSessionRows = sessionRows.slice(0, historyLimit);
    const sessionIds = visibleSessionRows.map((row) => row.id);
    const itemRows =
      sessionIds.length === 0
        ? []
        : await this.database
            .select()
            .from(sessionItems)
            .where(inArray(sessionItems.studySessionId, sessionIds))
            .orderBy(asc(sessionItems.studySessionId), asc(sessionItems.position));

    const itemsBySession = new Map<string, SessionItem[]>();
    for (const row of itemRows) {
      const items = itemsBySession.get(row.studySessionId) ?? [];
      items.push(itemFromRow(row));
      itemsBySession.set(row.studySessionId, items);
    }

    const mastery = masteryAggregate[0];
    const due = dueAggregate[0];

    return {
      lessonProgress: progressRows.map(progressFromRow),
      mastery: {
        conceptCount: mastery?.conceptCount ?? 0,
        averageScorePercent: mastery?.averageScorePercent ?? null,
        averageConfidencePercent: mastery?.averageConfidencePercent ?? null,
      },
      modalityEvidence: modalityRows.map((row) => ({
        modality: row.modality as ProgressModalityEvidenceSummary["modality"],
        evidenceCount: row.evidenceCount,
        correctCount: row.correctCount,
      })),
      weakConcepts: weakRows.map(masteryFromRow),
      dueReviewCount: due?.count ?? 0,
      recentSessions: visibleSessionRows.map((row) =>
        sessionFromRow(row, itemsBySession.get(row.id) ?? []),
      ),
      hasMoreSessions: sessionRows.length > historyLimit,
    };
  }
}
