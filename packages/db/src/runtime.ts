/** Runtime persistence surface for application delivery code. Excludes migration tooling. */
export {
  createDatabaseClient,
  type Database,
  type DatabaseClient,
} from "./client.ts";
export {
  createAuthAccount,
  createAuthSession,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  revokeAuthSessionByTokenHash,
} from "./auth.ts";
export { PostgresLearnerJourneyRepository } from "./repositories/postgres-learner-journey-repository.ts";
export { PostgresPracticeRepository } from "./repositories/postgres-practice-repository.ts";
export { PostgresProgressRepository } from "./repositories/postgres-progress-repository.ts";
export { PostgresSessionExecutionRepository } from "./repositories/postgres-session-execution-repository.ts";
export { PostgresSpeakingRepository } from "./repositories/postgres-speaking-repository.ts";
export { PostgresStudyRepository } from "./repositories/postgres-study-repository.ts";
export {
  findOwnershipFixtureForUser,
  updateOwnershipFixtureForUser,
} from "./ownership.ts";
