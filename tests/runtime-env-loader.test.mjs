import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveRuntimeEnvironment } from "../scripts/runtime-env.mjs";

const wrapperPath = fileURLToPath(
  new URL("../scripts/run-with-runtime-env.mjs", import.meta.url),
);

const runtimeKeys = [
  "APP_TIMEZONE",
  "LINGO_PROFILE",
  "LINGO_TEST_MODE",
  "NEXT_PUBLIC_APP_URL",
  "NODE_ENV",
];

function withoutRuntimeConfiguration(source) {
  const environment = { ...source };

  for (const key of runtimeKeys) delete environment[key];

  return environment;
}

async function createTemporaryDirectory() {
  return mkdtemp(join(tmpdir(), "lingo-pilot-env-"));
}

test("merges the root env file while preserving process environment precedence", async () => {
  const directory = await createTemporaryDirectory();
  const envFile = join(directory, ".env.local");

  try {
    await writeFile(
      envFile,
      [
        "NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400",
        "APP_TIMEZONE=America/Sao_Paulo",
        "RUNTIME_SOURCE=from-file",
        "",
      ].join("\n"),
      "utf8",
    );

    const resolved = await resolveRuntimeEnvironment({
      envFile,
      environment: {
        NEXT_PUBLIC_APP_URL: "https://override.example",
        RUNTIME_SOURCE: "from-process",
      },
    });

    assert.equal(resolved.source, `${envFile} + process environment`);
    assert.equal(
      resolved.environment.NEXT_PUBLIC_APP_URL,
      "https://override.example",
    );
    assert.equal(resolved.environment.APP_TIMEZONE, "America/Sao_Paulo");
    assert.equal(resolved.environment.RUNTIME_SOURCE, "from-process");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("runtime wrapper propagates repository-root .env.local values to its child command", async () => {
  const directory = await createTemporaryDirectory();

  try {
    await writeFile(
      join(directory, ".env.local"),
      [
        "NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400",
        "APP_TIMEZONE=America/Sao_Paulo",
        "LINGO_TEST_MODE=false",
        "",
      ].join("\n"),
      "utf8",
    );

    const probe =
      'process.stdout.write(`${process.env.NEXT_PUBLIC_APP_URL}|${process.env.APP_TIMEZONE}`);';
    const result = spawnSync(
      process.execPath,
      [wrapperPath, process.execPath, "-e", probe],
      {
        cwd: directory,
        encoding: "utf8",
        env: withoutRuntimeConfiguration(process.env),
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout,
      "http://127.0.0.1:5400|America/Sao_Paulo",
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("runtime wrapper still fails early when required configuration is absent", async () => {
  const directory = await createTemporaryDirectory();

  try {
    const result = spawnSync(
      process.execPath,
      [wrapperPath, process.execPath, "-e", "process.exit(0)"],
      {
        cwd: directory,
        encoding: "utf8",
        env: withoutRuntimeConfiguration(process.env),
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_PUBLIC_APP_URL/);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
