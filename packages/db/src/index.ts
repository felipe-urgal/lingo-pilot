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
export { appMetadata } from "./schema.ts";

export const packageBoundary = "db" as const;
