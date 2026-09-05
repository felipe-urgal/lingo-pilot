import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  LINGO_SHELL_CACHE,
  LINGO_STATIC_CACHE,
  isLingoCacheName,
  isPrivatePath,
  shouldCacheResponse,
  shouldClearCachesAfterResponse,
} from "../apps/web/public/sw-policy.mjs";

test("PWA cache policy never treats authenticated routes as cacheable assets", () => {
  for (const pathname of [
    "/app",
    "/app/today",
    "/app/review",
    "/api/session",
    "/api/auth/session",
    "/login",
    "/signup",
  ]) {
    assert.equal(isPrivatePath(pathname), true, pathname);
    assert.equal(
      shouldCacheResponse({ method: "GET", pathname, responseOk: true }),
      false,
      pathname,
    );
  }
});

test("PWA cache policy only persists successful Next.js static assets", () => {
  assert.equal(
    shouldCacheResponse({
      method: "GET",
      pathname: "/_next/static/chunks/app.js",
      responseOk: true,
    }),
    true,
  );
  assert.equal(
    shouldCacheResponse({
      method: "POST",
      pathname: "/_next/static/chunks/app.js",
      responseOk: true,
    }),
    false,
  );
  assert.equal(
    shouldCacheResponse({
      method: "GET",
      pathname: "/_next/static/chunks/app.js",
      responseOk: false,
    }),
    false,
  );
});

test("successful logout clears only LingoPilot-owned caches", () => {
  assert.equal(
    shouldClearCachesAfterResponse({
      method: "POST",
      pathname: "/api/auth/logout",
      status: 303,
    }),
    true,
  );
  assert.equal(
    shouldClearCachesAfterResponse({
      method: "POST",
      pathname: "/api/auth/logout",
      status: 500,
    }),
    false,
  );
  assert.equal(isLingoCacheName(LINGO_SHELL_CACHE), true);
  assert.equal(isLingoCacheName(LINGO_STATIC_CACHE), true);
  assert.equal(isLingoCacheName("unrelated-cache"), false);
});

test("service worker does not introduce mutation replay storage", async () => {
  const worker = await readFile(
    new URL("../apps/web/public/sw.mjs", import.meta.url),
    "utf8",
  );

  assert.equal(worker.includes("indexedDB"), false);
  assert.equal(worker.includes("SyncManager"), false);
  assert.equal(/addEventListener\(["']sync["']/.test(worker), false);
});
