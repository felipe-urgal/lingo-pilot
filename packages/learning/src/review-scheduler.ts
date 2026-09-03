export const REVIEW_ALGORITHM_VERSION = "review-scheduler-v1" as const;

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export interface ReviewStateSnapshot {
  readonly dueAt: Date;
  readonly intervalSeconds: number;
  readonly reviewCount: number;
}

export interface ReviewScheduleResult {
  readonly dueAt: Date;
  readonly intervalSeconds: number;
  readonly algorithmVersion: typeof REVIEW_ALGORITHM_VERSION;
}

export interface ReviewScheduler {
  schedule(
    state: ReviewStateSnapshot,
    grade: ReviewGrade,
    now: Date,
  ): ReviewScheduleResult;
  preview(
    state: ReviewStateSnapshot,
    now: Date,
  ): Readonly<Record<ReviewGrade, ReviewScheduleResult>>;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function secondsForGrade(
  state: ReviewStateSnapshot,
  grade: ReviewGrade,
): number {
  switch (grade) {
    case "again":
      return 10 * MINUTE;
    case "hard":
      return state.reviewCount === 0
        ? 12 * HOUR
        : Math.max(DAY, Math.round(state.intervalSeconds * 1.25));
    case "good":
      return state.reviewCount === 0
        ? DAY
        : Math.max(2 * DAY, Math.round(state.intervalSeconds * 2));
    case "easy":
      return state.reviewCount === 0
        ? 3 * DAY
        : Math.max(4 * DAY, Math.round(state.intervalSeconds * 3));
  }
}

function scheduleAt(now: Date, intervalSeconds: number): Date {
  return new Date(now.getTime() + intervalSeconds * 1000);
}

export function createReviewSchedulerV1(): ReviewScheduler {
  function schedule(
    state: ReviewStateSnapshot,
    grade: ReviewGrade,
    now: Date,
  ): ReviewScheduleResult {
    const intervalSeconds = secondsForGrade(state, grade);
    return {
      dueAt: scheduleAt(now, intervalSeconds),
      intervalSeconds,
      algorithmVersion: REVIEW_ALGORITHM_VERSION,
    };
  }

  return {
    schedule,
    preview: (state, now) => ({
      again: schedule(state, "again", now),
      hard: schedule(state, "hard", now),
      good: schedule(state, "good", now),
      easy: schedule(state, "easy", now),
    }),
  };
}

export function reviewGradeFromResult(
  input: Readonly<{
    correct: boolean;
    hintCount: number;
    independent: boolean;
  }>,
): ReviewGrade {
  if (!input.correct) return "again";
  if (input.hintCount > 0) return "hard";
  return input.independent ? "easy" : "good";
}

export function initialReviewSchedule(
  grade: ReviewGrade,
  now: Date,
): ReviewScheduleResult {
  return createReviewSchedulerV1().schedule(
    { dueAt: now, intervalSeconds: 0, reviewCount: 0 },
    grade,
    now,
  );
}
