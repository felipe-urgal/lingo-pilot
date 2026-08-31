import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const manifestUrl = new URL(
  "../.dev-dashboard/production.json",
  import.meta.url,
);
const gatePath = fileURLToPath(
  new URL("../scripts/production-gate.mjs", import.meta.url),
);

const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

test(
  "Production Contract permanece fail-closed até os blockers serem resolvidos",
  () => {
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
  },
);

test("prod:status informa blockers do contrato sem falhar", () => {
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

test("prod:check falha de propósito e informa blockers do contrato", () => {
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
