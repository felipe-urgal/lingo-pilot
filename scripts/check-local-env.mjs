import { parseServerEnvironment } from "@lingo-pilot/config/runtime/environment";
import { resolveRuntimeEnvironment } from "./runtime-env.mjs";

try {
  const { environment, source } = await resolveRuntimeEnvironment();
  const config = parseServerEnvironment(environment);

  console.log(
    `[env] valid (${source}): profile=${config.profile}, app=${config.public.appUrl}, timezone=${config.timeZone}, testMode=${config.testMode}`,
  );
} catch (error) {
  console.error(
    `[env] invalid configuration: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
