import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const manifestUrl = new URL(
  "../.dev-dashboard/production.json",
  import.meta.url,
);
const gateUrl = new URL("../scripts/production-gate.mjs", import.meta.url);

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

test("prod:status informa blockers sem falhar", () => {
  const result = spawnSync(process.execPath, [gateUrl.pathname, "status"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /Produção do LingoPilot ainda está bloqueada por contrato/,
  );
  assert.match(result.stdout, /vercel-project-not-configured/);
});

test("prod:check falha de propósito enquanto produção não está pronta", () => {
  const result = spawnSync(process.execPath, [gateUrl.pathname, "check"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Produção do LingoPilot não está pronta para habilitação/,
  );
});
