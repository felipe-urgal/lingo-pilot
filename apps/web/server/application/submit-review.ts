import type {
  Clock,
  IdGenerator,
  LearnerJourney,
  PersistedActivityAnswer,
  PracticeRepository,
  SessionExecutionRepository,
} from "../../../../packages/domain/src/index.ts";
import type { CurriculumCatalog } from "../../../../packages/content/src/index.ts";
import {
  computeMastery,
  createReviewSchedulerV1,
  evaluateActivity,
  reviewGradeFromResult,
} from "../../../../packages/learning/src/index.ts";
import { getPracticeActivity } from "../practice/activity-catalog";

export type SubmitReviewError =
  "invalid-input" | "not-due" | "content-unavailable" | "stale-review";

export type SubmitReviewResult =
  | Readonly<{
      ok: true;
      reviewEventId: string;
      correct: boolean;
      grade: "again" | "hard" | "good" | "easy";
      nextDueAt: Date;
      duplicate: boolean;
    }>
  | Readonly<{ ok: false; reason: SubmitReviewError }>;

export interface SubmitReviewDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly catalog: CurriculumCatalog;
  readonly practice: PracticeRepository;
  readonly execution: SessionExecutionRepository;
}

export interface SubmitReviewInput {
  readonly journey: LearnerJourney;
  readonly memoryItemId: string;
  readonly sessionItemId?: string;
  readonly operationKey: string;
  readonly answer: PersistedActivityAnswer;
  readonly hintCount: number;
}

function isSafeIdentifier(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export function createSubmitReview(dependencies: SubmitReviewDependencies) {
  return async function execute(
    input: SubmitReviewInput,
  ): Promise<SubmitReviewResult> {
    if (
      !isSafeIdentifier(input.memoryItemId) ||
      (input.sessionItemId !== undefined &&
        !isSafeIdentifier(input.sessionItemId)) ||
      !isSafeIdentifier(input.operationKey) ||
      !Number.isInteger(input.hintCount) ||
      input.hintCount < 0
    ) {
      return { ok: false, reason: "invalid-input" };
    }

    const now = dependencies.clock.now();
    const duplicate = await dependencies.practice.findReviewByOperation(
      input.journey.enrollment.id,
      input.operationKey,
    );
    if (duplicate) {
      if (input.sessionItemId) {
        await dependencies.execution.finalizeSessionContainingItem({
          enrollmentId: input.journey.enrollment.id,
          itemId: input.sessionItemId,
          now,
        });
      }
      return {
        ok: true,
        reviewEventId: duplicate.id,
        correct: duplicate.correct,
        grade: duplicate.grade,
        nextDueAt: duplicate.nextDueAt,
        duplicate: true,
      };
    }

    const due = await dependencies.practice.listDueReviewItems(
      input.journey.enrollment.id,
      now,
      100,
    );
    const memory = due.find((candidate) => candidate.id === input.memoryItemId);
    if (!memory) return { ok: false, reason: "not-due" };

    const activity = getPracticeActivity(
      dependencies.catalog,
      memory.sourceActivityId,
    );
    if (!activity) return { ok: false, reason: "content-unavailable" };

    const evaluated = evaluateActivity(activity.definition, input.answer);
    if (!evaluated.ok) return { ok: false, reason: "invalid-input" };

    const hintCount = Math.min(input.hintCount, activity.hints.length);
    const grade = reviewGradeFromResult({
      correct: evaluated.evaluation.correct,
      hintCount,
      independent: true,
    });
    const scheduled = createReviewSchedulerV1().schedule(
      {
        dueAt: memory.dueAt,
        intervalSeconds: memory.intervalSeconds,
        reviewCount: memory.reviewCount,
      },
      grade,
      now,
    );
    const persisted = await dependencies.practice.recordReview(
      {
        reviewEventId: dependencies.idGenerator.generate(),
        enrollmentId: input.journey.enrollment.id,
        memoryItemId: memory.id,
        sessionItemId: input.sessionItemId ?? null,
        operationKey: input.operationKey,
        expectedReviewCount: memory.reviewCount,
        grade,
        correct: evaluated.evaluation.correct,
        hintCount,
        nextDueAt: scheduled.dueAt,
        intervalSeconds: scheduled.intervalSeconds,
        algorithmVersion: scheduled.algorithmVersion,
        modality: activity.content.modality,
        supportLevel: hintCount > 0 ? 1 : 0,
        now,
      },
      (evidence) => computeMastery(evidence, now),
    );
    if (!persisted.ok) {
      return {
        ok: false,
        reason:
          persisted.reason === "stale-review" ? "stale-review" : "not-due",
      };
    }

    if (input.sessionItemId) {
      await dependencies.execution.finalizeSessionContainingItem({
        enrollmentId: input.journey.enrollment.id,
        itemId: input.sessionItemId,
        now,
      });
    }

    return {
      ok: true,
      reviewEventId: persisted.event.id,
      correct: persisted.event.correct,
      grade: persisted.event.grade,
      nextDueAt: persisted.event.nextDueAt,
      duplicate: persisted.duplicate,
    };
  };
}
