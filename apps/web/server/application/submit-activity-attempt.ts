import type {
  Clock,
  IdGenerator,
  LearnerJourney,
  PersistedActivityAnswer,
  PracticeRepository,
  StudyRepository,
} from "../../../../packages/domain/src/index.ts";
import type { CurriculumCatalog } from "../../../../packages/content/src/index.ts";
import {
  computeMastery,
  evaluateActivity,
  initialReviewSchedule,
  reviewGradeFromResult,
} from "../../../../packages/learning/src/index.ts";
import { getPracticeActivity } from "../practice/activity-catalog";

export type SubmitActivityAttemptError =
  "invalid-input" | "invalid-reference" | "content-unavailable";

export type SubmitActivityAttemptResult =
  | Readonly<{
      ok: true;
      attemptId: string;
      correct: boolean;
      scorePercent: number;
      duplicate: boolean;
    }>
  | Readonly<{ ok: false; reason: SubmitActivityAttemptError }>;

export interface SubmitActivityAttemptDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
  readonly practice: PracticeRepository;
}

export interface SubmitActivityAttemptInput {
  readonly journey: LearnerJourney;
  readonly sessionId: string;
  readonly sessionItemId: string;
  readonly activityId: string;
  readonly operationKey: string;
  readonly answer: PersistedActivityAnswer;
  readonly hintCount: number;
}

function isSafeIdentifier(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export function createSubmitActivityAttempt(
  dependencies: SubmitActivityAttemptDependencies,
) {
  return async function execute(
    input: SubmitActivityAttemptInput,
  ): Promise<SubmitActivityAttemptResult> {
    if (
      !isSafeIdentifier(input.sessionId) ||
      !isSafeIdentifier(input.sessionItemId) ||
      !isSafeIdentifier(input.activityId) ||
      !isSafeIdentifier(input.operationKey) ||
      !Number.isInteger(input.hintCount) ||
      input.hintCount < 0
    ) {
      return { ok: false, reason: "invalid-input" };
    }

    const activity = getPracticeActivity(
      dependencies.catalog,
      input.activityId,
    );
    if (!activity) return { ok: false, reason: "content-unavailable" };

    const session = await dependencies.study.findSession(
      input.journey.enrollment.id,
      input.sessionId,
    );
    const item = session?.items.find(
      (candidate) =>
        candidate.id === input.sessionItemId &&
        candidate.kind === "lesson" &&
        candidate.resourceId === activity.content.lessonId,
    );
    if (!session || !item || session.status === "abandoned") {
      return { ok: false, reason: "invalid-reference" };
    }

    const evaluated = evaluateActivity(activity.definition, input.answer);
    if (!evaluated.ok) return { ok: false, reason: "invalid-input" };

    const now = dependencies.clock.now();
    const hintCount = Math.min(input.hintCount, activity.hints.length);
    const grade = reviewGradeFromResult({
      correct: evaluated.evaluation.correct,
      hintCount,
      independent: activity.content.supportLevel === 0,
    });
    const initialSchedule = initialReviewSchedule(grade, now);
    const conceptIds = [...new Set(activity.content.conceptIds)];
    const persisted = await dependencies.practice.submitAttempt(
      {
        attemptId: dependencies.idGenerator.generate(),
        enrollmentId: input.journey.enrollment.id,
        sessionItemId: item.id,
        activityId: activity.content.id,
        contentSchemaVersion: activity.content.schemaVersion,
        contentRevision: activity.content.revision,
        operationKey: input.operationKey,
        answer: input.answer,
        correct: evaluated.evaluation.correct,
        scorePercent: evaluated.evaluation.scorePercent,
        hintCount,
        modality: activity.content.modality,
        supportLevel: Math.max(
          activity.content.supportLevel,
          hintCount > 0 ? 1 : 0,
        ),
        evidenceKind:
          activity.content.supportLevel > 0 || hintCount > 0
            ? "guided"
            : "independent-retrieval",
        conceptIds,
        initialMemorySchedules: conceptIds.map((conceptId) => ({
          conceptId,
          memoryItemId: dependencies.idGenerator.generate(),
          dueAt: initialSchedule.dueAt,
          intervalSeconds: initialSchedule.intervalSeconds,
          algorithmVersion: initialSchedule.algorithmVersion,
        })),
        now,
      },
      (evidence) => computeMastery(evidence, now),
    );
    if (!persisted.ok) return { ok: false, reason: "invalid-reference" };

    return {
      ok: true,
      attemptId: persisted.attempt.id,
      correct: persisted.attempt.evaluation.correct,
      scorePercent: persisted.attempt.evaluation.scorePercent,
      duplicate: persisted.duplicate,
    };
  };
}
