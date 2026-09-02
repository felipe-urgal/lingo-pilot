import { defineConfig } from "@playwright/test";
import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";

const baseURL = "http://127.0.0.1:5401";
const testDatabase = parseTestDatabaseEnvironment(process.env);

export default defineConfig({
  fullyParallel: false,
  reporter: "line",
  retries: 0,
  testDir: "./tests/e2e",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev:e2e",
    env: {
      DATABASE_URL: testDatabase.url,
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/api/health/live`,
  },
  workers: 1,
});
