#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createCheckEnvironment } from "./production-environment.mjs";

const steps = [
  ["pnpm", ["format:check"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["exec", "turbo", "run", "typecheck"]],
  ["pnpm", ["test:unit"]],
  ["pnpm", ["--filter", "@lingo-pilot/db", "test:integration"]],
  ["pnpm", ["content:validate"]],
  ["pnpm", ["--filter", "@lingo-pilot/db", "db:check"]],
  ["pnpm", ["exec", "turbo", "run", "build"]],
];

let environment;
try {
  environment = createCheckEnvironment();
} catch (error) {
  console.error(
    `[prod:check] configuração inválida: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[prod:check] falha ao executar ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("[prod:check] preflight concluído com ambiente isolado.");
