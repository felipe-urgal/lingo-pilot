import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const manifestUrl = new URL(".dev-dashboard/production.json", rootUrl);
const gatePath = fileURLToPath(new URL("scripts/production-gate.mjs", rootUrl));
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

test("Production Contract continua fail-closed", () => {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.production.enabled, false);
  assert.equal(manifest.production.strategy, "disabled");
  assert.equal(manifest.production.provider, "none");
  assert.equal(manifest.production.branch, "main");
  assert.equal(manifest.production.commands.status, "prod:status");
  assert.equal(manifest.production.commands.check, "prod:check");
  assert.deepEqual(manifest.production.blockedBy, [
    "vercel-project-not-configured",
    "neon-production-not-validated",
    "backup-dr-not-validated",
    "migration-flow-not-validated",
    "production-health-not-configured",
  ]);
});

test("prod:status lê blockers do contrato", () => {
  const result = spawnSync(process.execPath, [gatePath, "status"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /Produção do LingoPilot ainda está bloqueada por contrato/,
  );

  for (const blocker of manifest.production.blockedBy) {
    assert.ok(result.stdout.includes(blocker));
  }
});

test("prod:check lê blockers do contrato e falha", () => {
  const result = spawnSync(process.execPath, [gatePath, "check"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Produção do LingoPilot não está pronta para habilitação/,
  );

  for (const blocker of manifest.production.blockedBy) {
    assert.ok(result.stderr.includes(blocker));
  }
});
