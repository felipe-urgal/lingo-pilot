import { loadEnvFile } from "node:process";
import { parseServerEnvironment } from "@lingo-pilot/config/runtime/environment";

let source = "process environment";

try {
  loadEnvFile(".env.local");
  source = ".env.local + process environment";
} catch (error) {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    error.code !== "ENOENT"
  ) {
    throw error;
  }
}

try {
  const config = parseServerEnvironment(process.env);
  console.log(
    `[env] valid (${source}): profile=${config.profile}, app=${config.public.appUrl}, timezone=${config.timeZone}, testMode=${config.testMode}`,
  );
} catch (error) {
  console.error(
    `[env] invalid configuration: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
