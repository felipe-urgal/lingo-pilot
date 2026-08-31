import { parseDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import {
  createDatabaseClient,
  migrateDatabase,
} from "../src/index.ts";

let client;

try {
  const databaseConfig = parseDatabaseEnvironment(process.env);
  client = createDatabaseClient(databaseConfig.url, {
    applicationName: "lingo-pilot-migrate",
    maxConnections: 1,
  });
  await migrateDatabase(client.db);
  console.info("[db] migrations applied successfully.");
} catch (error) {
  console.error(
    `[db] migration failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
