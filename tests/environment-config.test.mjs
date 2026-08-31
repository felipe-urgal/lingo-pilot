import assert from "node:assert/strict";
import test from "node:test";
import {
  E2E_PORT,
  EnvironmentValidationError,
  WEB_HOST,
  WEB_PORT,
  canonicalAppUrl,
  createWebProfileEnvironment,
  parsePublicEnvironment,
  parseServerEnvironment,
} from "@lingo-pilot/config/runtime/environment";

const baseEnvironment = {
  APP_TIMEZONE: "UTC",
  LINGO_TEST_MODE: "false",
  NEXT_PUBLIC_APP_URL: `http://${WEB_HOST}:${WEB_PORT}`,
};

test("parses a valid development environment", () => {
  const config = parseServerEnvironment({
    ...baseEnvironment,
    LINGO_PROFILE: "development",
  });

  assert.deepEqual(config, {
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
    () => parseServerEnvironment({ LINGO_PROFILE: "production" }),
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
    NEXT_PUBLIC_APP_URL: "https://example.com",
    SECRET_TOKEN: "must-not-leak",
  });

  assert.deepEqual(config, { appUrl: "https://example.com" });
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
