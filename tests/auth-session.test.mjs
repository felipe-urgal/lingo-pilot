import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isValidLoginPassword,
  normalizeEmail,
} from "../apps/web/server/auth/credentials.ts";
import {
  hashPassword,
  verifyPassword,
} from "../apps/web/server/auth/password.ts";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../apps/web/server/auth/cookie.ts";
import {
  createSessionToken,
  hashSessionToken,
  isSessionToken,
  SESSION_TTL_SECONDS,
} from "../apps/web/server/auth/session-token.ts";

test("normalizes login email without accepting malformed input", () => {
  assert.equal(normalizeEmail(" Learner@Example.COM "), "learner@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail(null), null);
});

test("validates bounded login passwords", () => {
  assert.equal(isValidLoginPassword("12345678"), true);
  assert.equal(isValidLoginPassword("short"), false);
  assert.equal(isValidLoginPassword("x".repeat(257)), false);
});

test("hashes passwords with scrypt and verifies without storing plaintext", async () => {
  const password = "correct horse battery staple";
  const encoded = await hashPassword(password);

  assert.match(encoded, /^scrypt\$131072\$8\$1\$/);
  assert.equal(encoded.includes(password), false);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword("wrong password", encoded), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});

test("session tokens are opaque and persisted through a one-way hash", () => {
  const token = createSessionToken();
  const hash = hashSessionToken(token);

  assert.equal(isSessionToken(token), true);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashSessionToken(token), hash);
});

test("session cookie is HttpOnly, same-site and secure in production", () => {
  assert.equal(SESSION_COOKIE_NAME, "lingo_session");
  assert.equal(SESSION_TTL_SECONDS, 2_592_000);

  assert.deepEqual(sessionCookieOptions("development", SESSION_TTL_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  assert.deepEqual(sessionCookieOptions("production", SESSION_TTL_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
});
