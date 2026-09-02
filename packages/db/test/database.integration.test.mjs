import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import {
  appMetadata,
  createAuthCredential,
  createAuthSession,
  createDatabaseClient,
  createOwnershipFixture,
  createUser,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  findOwnershipFixtureForUser,
  migrateDatabase,
  revokeAuthSessionByTokenHash,
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
    "select to_regclass('public.app_metadata') as metadata, to_regclass('public.users') as users, to_regclass('public.auth_credentials') as auth_credentials, to_regclass('public.auth_sessions') as auth_sessions, to_regclass('public.ownership_fixtures') as ownership_fixtures",
  );
  assert.equal(migrated.rows[0]?.metadata, "app_metadata");
  assert.equal(migrated.rows[0]?.users, "users");
  assert.equal(migrated.rows[0]?.auth_credentials, "auth_credentials");
  assert.equal(migrated.rows[0]?.auth_sessions, "auth_sessions");
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

test("persists credential identity and enforces canonical unique email", async () => {
  const suffix = randomUUID();
  const userAId = `credential-a-${suffix}`;
  const userBId = `credential-b-${suffix}`;
  const email = `learner-${suffix}@example.test`;

  await createUser(client.db, userAId);
  await createUser(client.db, userBId);
  await createAuthCredential(client.db, {
    userId: userAId,
    email,
    passwordHash: "scrypt$fixture",
  });

  const credential = await findAuthCredentialByEmail(client.db, email);
  assert.equal(credential?.userId, userAId);

  await assert.rejects(
    createAuthCredential(client.db, {
      userId: userBId,
      email,
      passwordHash: "scrypt$another-fixture",
    }),
  );

  await assert.rejects(
    createAuthCredential(client.db, {
      userId: userBId,
      email: ` Mixed-${suffix}@Example.test `,
      passwordHash: "scrypt$invalid-canonical",
    }),
  );
});

test("resolves only active non-revoked server sessions", async () => {
  const suffix = randomUUID();
  const userId = `session-user-${suffix}`;
  const activeHash = `active-${suffix}`;
  const expiredHash = `expired-${suffix}`;
  const now = new Date("2026-09-02T12:00:00.000Z");

  await createUser(client.db, userId);
  await createAuthSession(client.db, {
    id: `active-session-${suffix}`,
    userId,
    tokenHash: activeHash,
    expiresAt: new Date("2026-09-03T12:00:00.000Z"),
  });
  await createAuthSession(client.db, {
    id: `expired-session-${suffix}`,
    userId,
    tokenHash: expiredHash,
    expiresAt: new Date("2026-09-01T12:00:00.000Z"),
  });

  const active = await findActiveAuthSessionByTokenHash(client.db, activeHash, now);
  assert.equal(active?.userId, userId);

  const expired = await findActiveAuthSessionByTokenHash(client.db, expiredHash, now);
  assert.equal(expired, null);

  const revoked = await revokeAuthSessionByTokenHash(client.db, activeHash, now);
  assert.equal(revoked, true);

  const afterRevoke = await findActiveAuthSessionByTokenHash(client.db, activeHash, now);
  assert.equal(afterRevoke, null);
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

  const ownerRead = await findOwnershipFixtureForUser(client.db, userAId, resourceAId);
  assert.equal(ownerRead?.value, "private-to-a");

  const crossUserRead = await findOwnershipFixtureForUser(client.db, userBId, resourceAId);
  assert.equal(crossUserRead, null);

  const crossUserWrite = await updateOwnershipFixtureForUser(
    client.db,
    userBId,
    resourceAId,
    "tampered-by-b",
  );
  assert.equal(crossUserWrite, null);

  const afterCrossUserWrite = await findOwnershipFixtureForUser(client.db, userAId, resourceAId);
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
