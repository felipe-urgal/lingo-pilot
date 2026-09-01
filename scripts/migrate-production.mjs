#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { productionDatabaseEnvironment } from "./production-environment.mjs";

let environment;
try {
  environment = productionDatabaseEnvironment();
} catch (error) {
  console.error(
    `[prod:migrate] configuração inválida: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@lingo-pilot/db", "db:migrate"],
  {
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`[prod:migrate] falha ao iniciar migration: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
