import { parseDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import { createDatabaseClient } from "../src/index.ts";

let client;

try {
  const databaseConfig = parseDatabaseEnvironment(process.env);
  client = createDatabaseClient(databaseConfig.url, {
    applicationName: "lingo-pilot-smoke",
    maxConnections: 1,
  });
  const result = await client.pool.query(
    "select current_database() as database_name, current_setting('TimeZone') as timezone",
  );
  const row = result.rows[0];

  if (!row || row.timezone !== "UTC") {
    throw new Error("database connection is not using UTC timezone");
  }

  console.info("[db] connection healthy; PostgreSQL session timezone is UTC.");
} catch (error) {
  console.error(
    `[db] smoke check failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
