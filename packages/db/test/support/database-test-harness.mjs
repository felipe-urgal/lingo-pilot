import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import { createDatabaseClient, migrateDatabase } from "../../src/index.ts";

export function createDatabaseTestHarness({
  applicationName = "lingo-pilot-test-harness",
  environment = process.env,
} = {}) {
  const testDatabase = parseTestDatabaseEnvironment(environment);
  const client = createDatabaseClient(testDatabase.url, {
    applicationName,
    maxConnections: 2,
  });

  async function close() {
    await client.close();
  }

  async function recreateSchemas() {
    await client.pool.query("drop schema if exists drizzle cascade");
    await client.pool.query("drop schema if exists public cascade");
    await client.pool.query("create schema public");
  }

  async function migrate() {
    await migrateDatabase(client.db);
  }

  async function reset() {
    await recreateSchemas();
    await migrate();
  }

  return Object.freeze({
    client,
    close,
    migrate,
    recreateSchemas,
    reset,
  });
}
