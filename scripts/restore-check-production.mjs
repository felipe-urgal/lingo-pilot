#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { parseRestoreCheckDatabase } from "./production-environment.mjs";

const backupFile = process.argv[2];

if (!backupFile) {
  console.error("Uso: pnpm prod:restore-check -- <backup.dump>");
  process.exit(2);
}

await access(backupFile).catch(() => {
  console.error("[prod:restore-check] arquivo de backup não encontrado.");
  process.exit(1);
});

let restoreUrl;
try {
  restoreUrl = parseRestoreCheckDatabase();
} catch (error) {
  console.error(
    `[prod:restore-check] configuração inválida: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const environment = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(restoreUrl.password),
  PGSSLMODE: restoreUrl.searchParams.get("sslmode") || "require",
};

const connectionArgs = [
  `--host=${restoreUrl.hostname}`,
  `--port=${restoreUrl.port || "5432"}`,
  `--username=${decodeURIComponent(restoreUrl.username)}`,
  `--dbname=${decodeURIComponent(restoreUrl.pathname.slice(1))}`,
];

const restore = spawnSync(
  "pg_restore",
  [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    ...connectionArgs,
    backupFile,
  ],
  { env: environment, shell: false, stdio: "inherit" },
);

if (restore.error) {
  console.error("[prod:restore-check] pg_restore indisponível.");
  process.exit(1);
}
if (restore.status !== 0) process.exit(restore.status ?? 1);

const smoke = spawnSync(
  "psql",
  [
    ...connectionArgs,
    "--tuples-only",
    "--command=SELECT to_regclass('public.app_metadata');",
  ],
  { env: environment, encoding: "utf8", shell: false },
);

if (
  smoke.error ||
  smoke.status !== 0 ||
  !smoke.stdout?.includes("app_metadata")
) {
  console.error(
    "[prod:restore-check] restore concluído, mas validação de schema falhou.",
  );
  process.exit(1);
}

console.log("[prod:restore-check] backup restaurado e schema mínimo validado.");
