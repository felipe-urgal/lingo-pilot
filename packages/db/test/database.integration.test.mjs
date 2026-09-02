import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import {
  appMetadata,
  createDatabaseClient,
  createOwnershipFixture,
  createUser,
  findOwnershipFixtureForUser,
  migrateDatabase,
  updateOwnershipFixtureForUser,
  withTransaction,
} from "../src/index.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-integration-test",
  maxConnections: 2,
});

before(async () => {
  await client.pool.query("drop schema if exists drizzle cascade");
  await client.pool.query("drop schema if exists public cascade");
  await client.pool.query("create schema public");

  const beforeMigration = await client.pool.query(
    "select to_regclass('public.app_metadata') as relation",
  );
  assert.equal(beforeMigration.rows[0]?.relation, null);

  await migrateDatabase(client.db);
});

after(async () => {
  await client.close();
});

test("migrates an empty PostgreSQL database and supports insert/read", async () => {
  const migrated = await client.pool.query(
    "select to_regclass('public.app_metadata') as metadata, to_regclass('public.users') as users, to_regclass('public.ownership_fixtures') as ownership_fixtures",
  );
  assert.equal(migrated.rows[0]?.metadata, "app_metadata");
  assert.equal(migrated.rows[0]?.users, "users");
  assert.equal(migrated.rows[0]?.ownership_fixtures, "ownership_fixtures");

  await client.db.insert(appMetadata).values({
    key: "database-contract",
    value: "ready",
  });

  const rows = await client.db
    .select()
    .from(appMetadata)
    .where(eq(appMetadata.key, "database-contract"));

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.value, "ready");
  assert.ok(rows[0]?.createdAt instanceof Date);
  assert.ok(rows[0]?.updatedAt instanceof Date);
});

test("enforces the technical metadata key constraint", async () => {
  await assert.rejects(
    client.db.insert(appMetadata).values({ key: "", value: "invalid" }),
  );
});

test("rolls back all writes when a transaction fails", async () => {
  const rollbackError = new Error("rollback probe");

  await assert.rejects(
    withTransaction(client.db, async (transaction) => {
      await transaction.insert(appMetadata).values({
        key: "rollback-probe",
        value: "must-not-persist",
      });
      throw rollbackError;
    }),
    (error) => error === rollbackError,
  );

  const rows = await client.db
    .select()
    .from(appMetadata)
    .where(eq(appMetadata.key, "rollback-probe"));
  assert.equal(rows.length, 0);
});

test("ownership queries isolate resources between two users", async () => {
  const suffix = randomUUID();
  const userAId = `user-a-${suffix}`;
  const userBId = `user-b-${suffix}`;
  const resourceAId = `resource-a-${suffix}`;

  await createUser(client.db, userAId);
  await createUser(client.db, userBId);
  await createOwnershipFixture(client.db, {
    id: resourceAId,
    ownerId: userAId,
    value: "private-to-a",
  });

  const ownerRead = await findOwnershipFixtureForUser(
    client.db,
    userAId,
    resourceAId,
  );
  assert.equal(ownerRead?.value, "private-to-a");

  const crossUserRead = await findOwnershipFixtureForUser(
    client.db,
    userBId,
    resourceAId,
  );
  assert.equal(crossUserRead, null);

  const crossUserWrite = await updateOwnershipFixtureForUser(
    client.db,
    userBId,
    resourceAId,
    "tampered-by-b",
  );
  assert.equal(crossUserWrite, null);

  const afterCrossUserWrite = await findOwnershipFixtureForUser(
    client.db,
    userAId,
    resourceAId,
  );
  assert.equal(afterCrossUserWrite?.value, "private-to-a");

  const ownerWrite = await updateOwnershipFixtureForUser(
    client.db,
    userAId,
    resourceAId,
    "updated-by-a",
  );
  assert.equal(ownerWrite?.value, "updated-by-a");
});

test("ownership fixtures require an existing owner", async () => {
  await assert.rejects(
    createOwnershipFixture(client.db, {
      id: `orphan-${randomUUID()}`,
      ownerId: `missing-${randomUUID()}`,
      value: "invalid",
    }),
  );
});

test("forces PostgreSQL sessions to UTC", async () => {
  const result = await client.pool.query(
    "select current_setting('TimeZone') as timezone",
  );
  assert.equal(result.rows[0]?.timezone, "UTC");
});
