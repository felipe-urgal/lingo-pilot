/** Pure domain boundary. Framework and infrastructure dependencies are forbidden here. */
export {
  err,
  ok,
  type ApplicationError,
  type Clock,
  type IdGenerator,
  type Result,
} from "./foundation/contracts.ts";
export type { User } from "./identity/user.ts";
export type {
  UserRepository,
  UserRepositoryCreateError,
} from "./identity/user-repository.ts";
export {
  entryPointLevels,
  placementSources,
  primaryGoals,
  type Enrollment,
  type EnrollmentStatus,
  type EntryPointLevel,
  type LanguageProfile,
  type LearnerJourney,
  type LearnerProfile,
  type LearnerStatus,
  type PlacementSource,
  type PrimaryGoal,
} from "./learner/learner-journey.ts";
export type {
  LearnerJourneyRepository,
  SaveInitialLearnerJourneyInput,
} from "./learner/learner-journey-repository.ts";
export {
  evaluationSources,
  evidenceKinds,
  evidenceModalities,
  reviewGrades,
  type ActivityAttempt,
  type ActivityProgress,
  type AttemptEvaluation,
  type ConceptEvidence,
  type EvaluationSource,
  type EvidenceKind,
  type EvidenceModality,
  type MasteryState,
  type MemoryItem,
  type PersistedActivityAnswer,
  type ReviewEvent,
  type ReviewGrade,
} from "./learner/practice-learning.ts";
export type {
  DueReviewItem,
  InitialMemorySchedule,
  MasteryProjection,
  MasteryReducer,
  PracticeRepository,
  RecordReviewInput,
  RecordReviewResult,
  SubmitAttemptInput,
  SubmitAttemptResult,
} from "./learner/practice-repository.ts";
export type {
  SessionExecutionRepository,
  SessionRecoveryReason,
  SessionReviewResource,
  SkipSessionItemResult,
} from "./learner/session-execution-repository.ts";
export type {
  CompleteLessonInput,
  EnsureDailySessionInput,
  EnsureDailySessionItemInput,
  SaveLessonPositionInput,
  StartSessionItemInput,
  StudyMutationFailure,
  StudyMutationResult,
  StudyRepository,
} from "./learner/study-repository.ts";
export type {
  ContentRevisionRef,
  LessonProgress,
  LessonProgressStatus,
  SessionItem,
  SessionItemKind,
  SessionItemStatus,
  SessionReasonCode,
  StoredEligibilityReason,
  StudySession,
  StudySessionStatus,
} from "./learner/study-session.ts";

export const packageBoundary = "domain" as const;
