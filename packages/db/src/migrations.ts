import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client.ts";

export const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../drizzle", import.meta.url),
);

export function migrateDatabase(
  database: Database,
  migrationsFolder = DEFAULT_MIGRATIONS_FOLDER,
): Promise<void> {
  return migrate(database, { migrationsFolder });
}
