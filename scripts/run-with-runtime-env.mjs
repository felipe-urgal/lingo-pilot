import { spawn } from "node:child_process";
import { parseServerEnvironment } from "@lingo-pilot/config/runtime/environment";
import { resolveRuntimeEnvironment } from "./runtime-env.mjs";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error(
    "[env] runtime command is required. Usage: node scripts/run-with-runtime-env.mjs <command> [...args]",
  );
  process.exit(2);
}

let environment;

try {
  const resolved = await resolveRuntimeEnvironment();
  parseServerEnvironment(resolved.environment);
  environment = resolved.environment;
} catch (error) {
  console.error(
    `[env] cannot run ${command}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const child = spawn(command, args, {
  env: environment,
  stdio: "inherit",
  shell: process.platform === "win32",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`[env] failed to start ${command}: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
