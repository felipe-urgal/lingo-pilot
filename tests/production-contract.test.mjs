import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const manifestUrl = new URL(".dev-dashboard/production.json", rootUrl);
const statusPath = fileURLToPath(
  new URL("scripts/production-status.mjs", rootUrl),
);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

test("Production Contract está habilitado e mapeado explicitamente", () => {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.production.enabled, true);
  assert.equal(manifest.production.strategy, "git-managed");
  assert.equal(manifest.production.provider, "vercel");
  assert.equal(manifest.production.branch, "main");
  assert.equal(manifest.production.external.project, "lingo-pilot");
  assert.equal(manifest.production.health.type, "http");
  assert.equal(
    manifest.production.health.url,
    "https://lingo-pilot.vercel.app/api/health/ready",
  );
  assert.equal(manifest.production.blockedBy, undefined);
  assert.equal(manifest.production.reasonCode, undefined);
});

test("Production Contract preserva a interface operacional validada", () => {
  assert.deepEqual(manifest.production.commands, {
    status: "prod:status",
    check: "prod:check",
    migrate: "prod:migrate",
    verify: "prod:verify",
    backup: "prod:backup",
    restoreCheck: "prod:restore-check",
  });
});

test("prod:status reporta a readiness canônica configurada", () => {
  const result = spawnSync(process.execPath, [statusPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      LINGO_PRODUCTION_READY_URL: manifest.production.health.url,
    },
  });

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /\[prod:status\] configurado: https:\/\/lingo-pilot\.vercel\.app\/api\/health\/ready/,
  );
});
