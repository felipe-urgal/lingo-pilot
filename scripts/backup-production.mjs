#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parsedProductionDatabase } from "./production-environment.mjs";

let databaseUrl;
try {
  databaseUrl = parsedProductionDatabase();
} catch (error) {
  console.error(
    `[prod:backup] configuração inválida: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const backupsDirectory = resolve(".dev-dashboard/backups");
await mkdir(backupsDirectory, { recursive: true, mode: 0o700 });

const timestamp = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");
const outputFile = resolve(
  backupsDirectory,
  `lingo-pilot-${timestamp}.dump`,
);
const sslMode = databaseUrl.searchParams.get("sslmode") || "require";

const environment = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(databaseUrl.password),
  PGSSLMODE: sslMode,
};

const args = [
  "--format=custom",
  "--no-owner",
  "--no-privileges",
  `--host=${databaseUrl.hostname}`,
  `--port=${databaseUrl.port || "5432"}`,
  `--username=${decodeURIComponent(databaseUrl.username)}`,
  `--dbname=${decodeURIComponent(databaseUrl.pathname.slice(1))}`,
  `--file=${outputFile}`,
];

const result = spawnSync("pg_dump", args, {
  env: environment,
  shell: false,
  stdio: "inherit",
});

if (result.error) {
  console.error(
    "[prod:backup] pg_dump indisponível. Instale o cliente PostgreSQL compatível antes de executar backup.",
  );
  process.exit(1);
}

if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`[prod:backup] backup criado em ${outputFile}`);
