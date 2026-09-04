/** Boundary for deterministic session planning, mastery and review logic. */
export {
  evaluateActivity,
  deterministicActivityTypes,
  type ActivityAnswer,
  type ActivityEvaluation,
  type DeterministicActivityDefinition,
  type DeterministicActivityType,
  type EvaluateActivityResult,
  type MatchingDefinition,
  type MultipleChoiceDefinition,
  type SingleChoiceDefinition,
  type TextDefinition,
  type TextNormalization,
  type WordOrderDefinition,
} from "./activity-engine.ts";
export {
  canStartLesson,
  evaluateCurriculum,
  nextEligibleLesson,
  type CurriculumEntryPoint,
  type EligibilityReason,
  type EvaluateCurriculumInput,
  type LessonAvailability,
  type LessonEligibility,
  type LessonProgressSnapshot,
  type LessonProgressStatus,
} from "./curriculum-eligibility.ts";
export {
  DAILY_SESSION_PLANNER_VERSION,
  EXTREME_REVIEW_DEBT_MULTIPLIER,
  HEAVILY_OVERDUE_MS,
  REVIEW_BUDGET_RATIO,
  REVIEW_ESTIMATED_MINUTES,
  planDailySession,
  type DailySessionPlan,
  type DailySessionPlanDiagnostics,
  type DailySessionPlannerInput,
  type PlannedSessionItem,
  type PlannerEligibilityReason,
  type PlannerLessonCandidate,
  type PlannerModality,
  type PlannerReasonCode,
  type PlannerReviewCandidate,
} from "./daily-session-planner.ts";
export { localStudyDate } from "./local-study-date.ts";
export {
  MASTERY_ALGORITHM_VERSION,
  computeMastery,
  isWeakConcept,
  type MasteryEvidence,
  type MasteryProjection,
} from "./mastery.ts";
export {
  REVIEW_ALGORITHM_VERSION,
  createReviewSchedulerV1,
  initialReviewSchedule,
  reviewGradeFromResult,
  type ReviewGrade,
  type ReviewScheduleResult,
  type ReviewScheduler,
  type ReviewStateSnapshot,
} from "./review-scheduler.ts";

export const packageBoundary = "learning" as const;
