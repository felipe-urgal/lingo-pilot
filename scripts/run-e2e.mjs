import { spawnSync } from "node:child_process";
import { createDatabaseTestHarness } from "../packages/db/test/support/database-test-harness.mjs";

const harness = createDatabaseTestHarness({
  applicationName: "lingo-pilot-e2e-setup",
});

try {
  await harness.reset();
} finally {
  await harness.close();
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(executable, ["exec", "playwright", "test"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
