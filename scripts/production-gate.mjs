#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const manifestUrl = new URL(
  "../.dev-dashboard/production.json",
  import.meta.url,
);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const blockers = manifest.production?.blockedBy;

if (!Array.isArray(blockers) || blockers.length === 0) {
  console.error(
    "Contrato de produção inválido: production.blockedBy precisa declarar os bloqueadores atuais.",
  );
  process.exit(2);
}

const mode = process.argv[2] ?? "check";

if (mode === "status") {
  console.log("Produção do LingoPilot ainda está bloqueada por contrato.");
  console.log(`Blockers: ${blockers.join(", ")}`);
  process.exit(0);
}

if (mode !== "check") {
  console.error("Uso: node scripts/production-gate.mjs <status|check>");
  process.exit(2);
}

console.error("Produção do LingoPilot não está pronta para habilitação.");
console.error(`Resolva antes: ${blockers.join(", ")}`);
process.exit(1);
