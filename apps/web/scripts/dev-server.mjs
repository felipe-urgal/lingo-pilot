import { spawn } from "node:child_process";
import {
  assertPortAvailable,
  resolveWebPort,
  WEB_HOST,
} from "./port-contract.mjs";

const profile = process.argv[2] ?? "dev";
const port = resolveWebPort(profile);

try {
  await assertPortAvailable(port);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const executable = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(
  executable,
  ["dev", "--hostname", WEB_HOST, "--port", String(port)],
  {
    env: process.env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`Failed to start Next.js: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
