export const DAILY_SESSION_PLANNER_VERSION = "daily-session-v1";
export const REVIEW_ESTIMATED_MINUTES = 2;
export const REVIEW_BUDGET_RATIO = 0.4;
export const EXTREME_REVIEW_DEBT_MULTIPLIER = 2;
export const HEAVILY_OVERDUE_MS = 24 * 60 * 60 * 1000;

export type PlannerModality =
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "mixed";

export type PlannerReasonCode =
  | "RESUME_IN_PROGRESS"
  | "OVERDUE_REVIEW"
  | "WEAK_CONCEPT"
  | "NEW_ELIGIBLE_LESSON";

export type PlannerEligibilityReason =
  | "progress-satisfied"
  | "placement-waived"
  | "resume-in-progress"
  | "not-applicable";

export interface PlannerLessonCandidate {
  readonly id: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly estimatedMinutes: number;
  readonly eligibilityReason: Exclude<
    PlannerEligibilityReason,
    "not-applicable"
  >;
  readonly availability: "in_progress" | "available";
  readonly curriculumOrder: number;
}

export interface PlannerReviewCandidate {
  readonly id: string;
  readonly sourceActivityId: string;
  readonly conceptId: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly dueAt: Date;
  readonly modality: PlannerModality;
  readonly isWeakConcept: boolean;
}

export interface DailySessionPlannerInput {
  readonly plannerVersion: string;
  readonly now: Date;
  readonly dailyGoalMinutes: number;
  readonly dueReviewCount: number;
  readonly lessons: readonly PlannerLessonCandidate[];
  readonly reviews: readonly PlannerReviewCandidate[];
  readonly availableModalities: readonly PlannerModality[];
}

export interface PlannedSessionItem {
  readonly kind: "lesson" | "review";
  readonly resourceId: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly estimatedMinutes: number;
  readonly reasonCode: PlannerReasonCode;
  readonly eligibilityReason: PlannerEligibilityReason;
}

export interface DailySessionPlanDiagnostics {
  readonly estimatedMinutes: number;
  readonly reviewDebtCount: number;
  readonly reviewBudgetMinutes: number;
  readonly newContentSuspended: boolean;
  readonly unavailableModalityReviewCount: number;
}

export interface DailySessionPlan {
  readonly plannerVersion: string;
  readonly items: readonly PlannedSessionItem[];
  readonly diagnostics: DailySessionPlanDiagnostics;
}

function normalizedGoal(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1;
  return Math.max(1, Math.trunc(minutes));
}

function orderedLessons(
  lessons: readonly PlannerLessonCandidate[],
): readonly PlannerLessonCandidate[] {
  return [...lessons].sort(
    (left, right) =>
      left.curriculumOrder - right.curriculumOrder ||
      left.id.localeCompare(right.id),
  );
}

function orderedReviews(
  reviews: readonly PlannerReviewCandidate[],
): readonly PlannerReviewCandidate[] {
  return [...reviews].sort(
    (left, right) =>
      left.dueAt.getTime() - right.dueAt.getTime() ||
      left.id.localeCompare(right.id),
  );
}

function lessonItem(candidate: PlannerLessonCandidate): PlannedSessionItem {
  return {
    kind: "lesson",
    resourceId: candidate.id,
    schemaVersion: candidate.schemaVersion,
    revision: candidate.revision,
    estimatedMinutes: candidate.estimatedMinutes,
    reasonCode:
      candidate.availability === "in_progress"
        ? "RESUME_IN_PROGRESS"
        : "NEW_ELIGIBLE_LESSON",
    eligibilityReason: candidate.eligibilityReason,
  };
}

function reviewItem(
  candidate: PlannerReviewCandidate,
  reasonCode: "OVERDUE_REVIEW" | "WEAK_CONCEPT",
): PlannedSessionItem {
  return {
    kind: "review",
    resourceId: candidate.id,
    schemaVersion: candidate.schemaVersion,
    revision: candidate.revision,
    estimatedMinutes: REVIEW_ESTIMATED_MINUTES,
    reasonCode,
    eligibilityReason: "not-applicable",
  };
}

function appendIfFits(
  items: PlannedSessionItem[],
  candidate: PlannedSessionItem,
  budgetMinutes: number,
): boolean {
  const used = items.reduce((total, item) => total + item.estimatedMinutes, 0);
  if (used + candidate.estimatedMinutes > budgetMinutes) return false;
  items.push(candidate);
  return true;
}

function reviewBudget(goal: number, extremeDebt: boolean): number {
  if (extremeDebt) return goal;
  return Math.max(
    REVIEW_ESTIMATED_MINUTES,
    Math.floor(goal * REVIEW_BUDGET_RATIO),
  );
}

function isHeavilyOverdue(candidate: PlannerReviewCandidate, now: Date): boolean {
  return now.getTime() - candidate.dueAt.getTime() >= HEAVILY_OVERDUE_MS;
}

export function planDailySession(
  input: DailySessionPlannerInput,
): DailySessionPlan {
  const goal = normalizedGoal(input.dailyGoalMinutes);
  const available = new Set(input.availableModalities);
  const eligibleReviews = orderedReviews(input.reviews).filter((review) =>
    available.has(review.modality),
  );
  const unavailableModalityReviewCount =
    input.reviews.length - eligibleReviews.length;
  const debtMinutes = Math.max(0, input.dueReviewCount) * REVIEW_ESTIMATED_MINUTES;
  const extremeDebt =
    debtMinutes >= goal * EXTREME_REVIEW_DEBT_MULTIPLIER;
  const maxReviewMinutes = reviewBudget(goal, extremeDebt);
  const lessons = orderedLessons(input.lessons);
  const resume = lessons.find((lesson) => lesson.availability === "in_progress");
  const newLesson = lessons.find((lesson) => lesson.availability === "available");
  const items: PlannedSessionItem[] = [];
  let usedReviewMinutes = 0;

  if (resume) appendIfFits(items, lessonItem(resume), goal);

  const appendReview = (
    candidate: PlannerReviewCandidate,
    reasonCode: "OVERDUE_REVIEW" | "WEAK_CONCEPT",
  ) => {
    if (usedReviewMinutes + REVIEW_ESTIMATED_MINUTES > maxReviewMinutes) return;
    if (appendIfFits(items, reviewItem(candidate, reasonCode), goal)) {
      usedReviewMinutes += REVIEW_ESTIMATED_MINUTES;
    }
  };

  const heavilyOverdue = eligibleReviews.filter((review) =>
    isHeavilyOverdue(review, input.now),
  );
  for (const review of heavilyOverdue) appendReview(review, "OVERDUE_REVIEW");

  const remaining = eligibleReviews.filter(
    (review) => !heavilyOverdue.includes(review),
  );
  const weak = remaining.filter((review) => review.isWeakConcept);
  for (const review of weak) appendReview(review, "WEAK_CONCEPT");

  const newContentSuspended = extremeDebt && Boolean(newLesson) && !resume;
  if (!resume && newLesson && !newContentSuspended) {
    appendIfFits(items, lessonItem(newLesson), goal);
  }

  const ordinary = remaining.filter((review) => !review.isWeakConcept);
  for (const review of ordinary) appendReview(review, "OVERDUE_REVIEW");

  return {
    plannerVersion: input.plannerVersion,
    items,
    diagnostics: {
      estimatedMinutes: items.reduce(
        (total, item) => total + item.estimatedMinutes,
        0,
      ),
      reviewDebtCount: Math.max(0, Math.trunc(input.dueReviewCount)),
      reviewBudgetMinutes: maxReviewMinutes,
      newContentSuspended,
      unavailableModalityReviewCount,
    },
  };
}
