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

interface PlannerCandidates {
  readonly goal: number;
  readonly reviews: readonly PlannerReviewCandidate[];
  readonly unavailableReviewCount: number;
  readonly extremeDebt: boolean;
  readonly maxReviewMinutes: number;
  readonly resume: PlannerLessonCandidate | undefined;
  readonly newLesson: PlannerLessonCandidate | undefined;
}

function normalizedGoal(minutes: number): number {
  if (!Number.isFinite(minutes)) return REVIEW_ESTIMATED_MINUTES;
  return Math.max(REVIEW_ESTIMATED_MINUTES, Math.trunc(minutes));
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

function estimatedMinutes(items: readonly PlannedSessionItem[]): number {
  return items.reduce((total, item) => total + item.estimatedMinutes, 0);
}

function appendIfFits(
  items: PlannedSessionItem[],
  candidate: PlannedSessionItem,
  budgetMinutes: number,
): boolean {
  if (estimatedMinutes(items) + candidate.estimatedMinutes > budgetMinutes) {
    return false;
  }
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

function prepareCandidates(input: DailySessionPlannerInput): PlannerCandidates {
  const goal = normalizedGoal(input.dailyGoalMinutes);
  const available = new Set(input.availableModalities);
  const reviews = orderedReviews(input.reviews).filter((review) =>
    available.has(review.modality),
  );
  const debtMinutes = Math.max(0, input.dueReviewCount) * REVIEW_ESTIMATED_MINUTES;
  const extremeDebt = debtMinutes >= goal * EXTREME_REVIEW_DEBT_MULTIPLIER;
  const lessons = orderedLessons(input.lessons);
  return {
    goal,
    reviews,
    unavailableReviewCount: input.reviews.length - reviews.length,
    extremeDebt,
    maxReviewMinutes: reviewBudget(goal, extremeDebt),
    resume: lessons.find((lesson) => lesson.availability === "in_progress"),
    newLesson: lessons.find((lesson) => lesson.availability === "available"),
  };
}

function addReviews(
  items: PlannedSessionItem[],
  candidates: readonly PlannerReviewCandidate[],
  reasonCode: "OVERDUE_REVIEW" | "WEAK_CONCEPT",
  totalBudget: number,
  reviewBudgetMinutes: number,
): number {
  let used = 0;
  for (const candidate of candidates) {
    if (used + REVIEW_ESTIMATED_MINUTES > reviewBudgetMinutes) break;
    if (appendIfFits(items, reviewItem(candidate, reasonCode), totalBudget)) {
      used += REVIEW_ESTIMATED_MINUTES;
    }
  }
  return used;
}

function reviewGroups(
  reviews: readonly PlannerReviewCandidate[],
  now: Date,
) {
  const heavilyOverdue = reviews.filter(
    (review) => now.getTime() - review.dueAt.getTime() >= HEAVILY_OVERDUE_MS,
  );
  const heavyIds = new Set(heavilyOverdue.map((review) => review.id));
  const remaining = reviews.filter((review) => !heavyIds.has(review.id));
  return {
    heavilyOverdue,
    weak: remaining.filter((review) => review.isWeakConcept),
    ordinary: remaining.filter((review) => !review.isWeakConcept),
  };
}

function selectPlanItems(
  input: DailySessionPlannerInput,
  candidates: PlannerCandidates,
): readonly PlannedSessionItem[] {
  const items: PlannedSessionItem[] = [];
  if (candidates.resume) {
    appendIfFits(items, lessonItem(candidates.resume), candidates.goal);
  }
  const groups = reviewGroups(candidates.reviews, input.now);
  let reviewRemaining = candidates.maxReviewMinutes;
  reviewRemaining -= addReviews(
    items,
    groups.heavilyOverdue,
    "OVERDUE_REVIEW",
    candidates.goal,
    reviewRemaining,
  );
  reviewRemaining -= addReviews(
    items,
    groups.weak,
    "WEAK_CONCEPT",
    candidates.goal,
    reviewRemaining,
  );
  if (!candidates.resume && candidates.newLesson && !candidates.extremeDebt) {
    appendIfFits(items, lessonItem(candidates.newLesson), candidates.goal);
  }
  addReviews(
    items,
    groups.ordinary,
    "OVERDUE_REVIEW",
    candidates.goal,
    reviewRemaining,
  );
  return items;
}

export function planDailySession(
  input: DailySessionPlannerInput,
): DailySessionPlan {
  const candidates = prepareCandidates(input);
  const items = selectPlanItems(input, candidates);
  return {
    plannerVersion: input.plannerVersion,
    items,
    diagnostics: {
      estimatedMinutes: estimatedMinutes(items),
      reviewDebtCount: Math.max(0, Math.trunc(input.dueReviewCount)),
      reviewBudgetMinutes: candidates.maxReviewMinutes,
      newContentSuspended:
        candidates.extremeDebt && Boolean(candidates.newLesson) && !candidates.resume,
      unavailableModalityReviewCount: candidates.unavailableReviewCount,
    },
  };
}
