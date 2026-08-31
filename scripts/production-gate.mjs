#!/usr/bin/env node

const blockers = [
  "vercel-project-not-configured",
  "neon-production-not-validated",
  "backup-dr-not-validated",
  "migration-flow-not-validated",
  "production-health-not-configured",
];

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
