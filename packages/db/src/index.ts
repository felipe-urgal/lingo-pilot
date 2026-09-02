/** PostgreSQL persistence boundary. Domain packages must not depend on this package. */
export {
  createDatabaseClient,
  withTransaction,
  type Database,
  type DatabaseClient,
  type DatabaseClientOptions,
  type DatabaseTransaction,
} from "./client.ts";
export { DEFAULT_MIGRATIONS_FOLDER, migrateDatabase } from "./migrations.ts";
export {
  createAuthAccount,
  createAuthCredential,
  createAuthSession,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  revokeAuthSessionByTokenHash,
  type AuthCredentialRecord,
  type AuthSessionRecord,
  type CreateAuthAccountInput,
  type CreateAuthCredentialInput,
  type CreateAuthSessionInput,
} from "./auth.ts";
export {
  createOwnershipFixture,
  createUser,
  findOwnershipFixtureForUser,
  updateOwnershipFixtureForUser,
  type CreateOwnershipFixtureInput,
  type OwnershipFixtureRecord,
  type UserRecord,
} from "./ownership.ts";
export { PostgresLearnerJourneyRepository } from "./repositories/postgres-learner-journey-repository.ts";
export {
  appMetadata,
  authCredentials,
  authSessions,
  enrollments,
  languageProfiles,
  learnerProfiles,
  ownershipFixtures,
  users,
} from "./schema.ts";

export const packageBoundary = "db" as const;
