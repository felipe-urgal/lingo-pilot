import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredRunbooks = [
  "deploy.md",
  "migration-failure.md",
  "backup-restore.md",
  "vercel-outage.md",
  "database-outage.md",
  "auth-outage.md",
  "leaked-secret.md",
  "data-corruption.md",
];

const requiredSections = [
  "## Pré-condições",
  "## Procedimento",
  "## Sinais de sucesso",
  "## Sinais de falha",
  "## Critérios de decisão",
  "## Recuperação",
  "## Escalonamento",
];

async function readRepoFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("production runbooks expose the executable incident contract", async () => {
  for (const runbook of requiredRunbooks) {
    const content = await readRepoFile(path.join("docs", "runbooks", runbook));
    for (const section of requiredSections) {
      assert.match(content, new RegExp(section));
    }
  }
});

test("Vercel Git integration remains disabled in favor of explicit provider deploy", async () => {
  const vercel = JSON.parse(await readRepoFile("vercel.json"));
  const production = await readRepoFile("docs/PRODUCTION.md");
  const adr = await readRepoFile(
    "docs/ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md",
  );

  assert.equal(vercel.git?.deploymentEnabled, false);
  assert.match(production, /provider-deploy/);
  assert.match(production, /Dev Dashboard/);
  assert.match(adr, /git\.deploymentEnabled=false/);
  assert.doesNotMatch(
    production,
    /merge\/push em `?main`?\s*\n?-> integração Git da Vercel/i,
  );
});
