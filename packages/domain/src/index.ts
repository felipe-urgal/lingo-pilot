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
export type {
  CompleteLessonInput,
  EnsureDailySessionInput,
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
