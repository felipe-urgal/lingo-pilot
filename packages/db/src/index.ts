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
  createOwnershipFixture,
  createUser,
  findOwnershipFixtureForUser,
  updateOwnershipFixtureForUser,
  type CreateOwnershipFixtureInput,
  type OwnershipFixtureRecord,
  type UserRecord,
} from "./ownership.ts";
export { appMetadata, ownershipFixtures, users } from "./schema.ts";

export const packageBoundary = "db" as const;
