/** Boundary for deterministic session planning, mastery and review logic. */
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

export const packageBoundary = "learning" as const;
