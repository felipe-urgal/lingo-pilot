import assert from "node:assert/strict";
import test from "node:test";
import {
  DATABASE_HOST,
  DATABASE_PORT,
  E2E_PORT,
  EnvironmentValidationError,
  WEB_HOST,
  WEB_PORT,
  canonicalAppUrl,
  createWebProfileEnvironment,
  parseDatabaseEnvironment,
  parsePublicEnvironment,
  parseServerEnvironment,
  parseTestDatabaseEnvironment,
} from "@lingo-pilot/config/runtime/environment";

const localDatabaseUrl = `postgresql://lingo_pilot:local@${DATABASE_HOST}:${DATABASE_PORT}/lingo_pilot_dev`;
const localTestDatabaseUrl = `postgresql://lingo_pilot:local@${DATABASE_HOST}:${DATABASE_PORT}/lingo_pilot_test`;

const baseEnvironment = {
  APP_TIMEZONE: "UTC",
  DATABASE_URL: localDatabaseUrl,
  LINGO_TEST_MODE: "false",
  NEXT_PUBLIC_APP_URL: `http://${WEB_HOST}:${WEB_PORT}`,
};

test("parses a valid development environment", () => {
  const config = parseServerEnvironment({
    ...baseEnvironment,
    LINGO_PROFILE: "development",
  });

  assert.deepEqual(config, {
    database: { url: localDatabaseUrl },
    profile: "development",
    timeZone: "UTC",
    testMode: false,
    public: {
      appUrl: `http://${WEB_HOST}:${WEB_PORT}`,
    },
  });
});

test("fails early when the public app URL is missing", () => {
  assert.throws(
    () =>
      parseServerEnvironment({
        DATABASE_URL: "postgresql://user:pass@example.com/app",
        LINGO_PROFILE: "production",
      }),
    (error) =>
      error instanceof EnvironmentValidationError &&
      error.key === "NEXT_PUBLIC_APP_URL",
  );
});

test("rejects app URLs that contain paths or credentials", () => {
  assert.throws(() =>
    parsePublicEnvironment({
      NEXT_PUBLIC_APP_URL: "https://user:pass@example.com/app",
    }),
  );

  assert.throws(() =>
    parsePublicEnvironment({
      NEXT_PUBLIC_APP_URL: "https://example.com/app",
    }),
  );
});

test("public configuration never carries server-only values", () => {
  const config = parsePublicEnvironment({
    DATABASE_URL: localDatabaseUrl,
    NEXT_PUBLIC_APP_URL: "https://example.com",
    SECRET_TOKEN: "must-not-leak",
    TEST_DATABASE_URL: localTestDatabaseUrl,
  });

  assert.deepEqual(config, { appUrl: "https://example.com" });
  assert.equal("DATABASE_URL" in config, false);
  assert.equal("TEST_DATABASE_URL" in config, false);
  assert.equal("SECRET_TOKEN" in config, false);
});

test("enforces the canonical E2E URL and test mode", () => {
  assert.throws(() =>
    parseServerEnvironment({
      ...baseEnvironment,
      LINGO_PROFILE: "e2e",
      LINGO_TEST_MODE: "true",
    }),
  );

  const config = parseServerEnvironment({
    APP_TIMEZONE: "UTC",
    DATABASE_URL: localDatabaseUrl,
    LINGO_PROFILE: "e2e",
    LINGO_TEST_MODE: "true",
    NEXT_PUBLIC_APP_URL: `http://${WEB_HOST}:${E2E_PORT}`,
  });

  assert.equal(config.profile, "e2e");
  assert.equal(config.testMode, true);
});

test("rejects invalid timezone and production test mode", () => {
  assert.throws(() =>
    parseServerEnvironment({
      ...baseEnvironment,
      APP_TIMEZONE: "Mars/Olympus",
      LINGO_PROFILE: "development",
    }),
  );

  assert.throws(() =>
    parseServerEnvironment({
      APP_TIMEZONE: "UTC",
      DATABASE_URL: "postgresql://user:pass@example.com/app",
      LINGO_PROFILE: "production",
      LINGO_TEST_MODE: "true",
      NEXT_PUBLIC_APP_URL: "https://lingo-pilot.example",
    }),
  );
});

test("web profiles produce deterministic runtime environment", () => {
  assert.deepEqual(createWebProfileEnvironment("dev"), {
    LINGO_PROFILE: "development",
    LINGO_TEST_MODE: "false",
    NEXT_PUBLIC_APP_URL: canonicalAppUrl("dev"),
  });

  assert.deepEqual(createWebProfileEnvironment("e2e"), {
    LINGO_PROFILE: "e2e",
    LINGO_TEST_MODE: "true",
    NEXT_PUBLIC_APP_URL: canonicalAppUrl("e2e"),
  });
});

test("development database must use the reserved local endpoint", () => {
  assert.deepEqual(
    parseDatabaseEnvironment({
      DATABASE_URL: localDatabaseUrl,
      LINGO_PROFILE: "development",
    }),
    { url: localDatabaseUrl },
  );

  assert.throws(
    () =>
      parseDatabaseEnvironment({
        DATABASE_URL:
          "postgresql://lingo_pilot:local@127.0.0.1:5432/lingo_pilot_dev",
        LINGO_PROFILE: "development",
      }),
    (error) =>
      error instanceof EnvironmentValidationError &&
      error.key === "DATABASE_URL",
  );
});

test("integration database must be explicitly test-only and isolated", () => {
  assert.deepEqual(
    parseTestDatabaseEnvironment({
      DATABASE_URL: localDatabaseUrl,
      LINGO_PROFILE: "development",
      TEST_DATABASE_URL: localTestDatabaseUrl,
    }),
    { url: localTestDatabaseUrl },
  );

  assert.throws(
    () =>
      parseTestDatabaseEnvironment({
        DATABASE_URL: localDatabaseUrl,
        LINGO_PROFILE: "development",
        TEST_DATABASE_URL: localDatabaseUrl,
      }),
    (error) =>
      error instanceof EnvironmentValidationError &&
      error.key === "TEST_DATABASE_URL",
  );

  assert.throws(() =>
    parseTestDatabaseEnvironment({
      LINGO_PROFILE: "test",
      TEST_DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/shared_db",
    }),
  );
});
