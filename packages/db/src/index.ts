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
  createAuthCredential,
  createAuthSession,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  revokeAuthSessionByTokenHash,
  type AuthCredentialRecord,
  type AuthSessionRecord,
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
export {
  appMetadata,
  authCredentials,
  authSessions,
  ownershipFixtures,
  users,
} from "./schema.ts";

export const packageBoundary = "db" as const;
