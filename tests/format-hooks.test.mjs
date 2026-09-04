import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function git(cwd, args, options = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    ...options,
  });
}

async function createRepository() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "lingo-format-hooks-"),
  );
  git(directory, ["init", "--quiet"]);
  git(directory, ["config", "user.email", "tests@example.invalid"]);
  git(directory, ["config", "user.name", "LingoPilot Tests"]);
  return directory;
}

function runScript(cwd, scriptName) {
  execFileSync("node", [path.join(repositoryRoot, "scripts", scriptName)], {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

test("installs a managed executable pre-commit hook", async () => {
  const directory = await createRepository();
  runScript(directory, "install-git-hooks.mjs");

  const hookPath = path.join(directory, ".git", "hooks", "pre-commit");
  const hook = await readFile(hookPath, "utf8");
  const hookStat = await stat(hookPath);

  assert.match(hook, /managed by lingo-pilot/);
  assert.match(hook, /pnpm format:staged/);
  assert.notEqual(hookStat.mode & 0o111, 0);
});

test("does not overwrite an unmanaged pre-commit hook", async () => {
  const directory = await createRepository();
  const hookPath = path.join(directory, ".git", "hooks", "pre-commit");
  const customHook = "#!/bin/sh\necho custom\n";
  await writeFile(hookPath, customHook, "utf8");

  runScript(directory, "install-git-hooks.mjs");

  assert.equal(await readFile(hookPath, "utf8"), customHook);
});

test("formats the staged snapshot without absorbing unstaged changes", async () => {
  const directory = await createRepository();
  const filePath = path.join(directory, "sample.ts");

  await writeFile(filePath, "const initial = 1;\n", "utf8");
  git(directory, ["add", "sample.ts"]);
  git(directory, ["commit", "--quiet", "-m", "baseline"]);

  const staged = "const first={a:1,b:2}\n";
  const working = `${staged}const second={c:3}\n`;
  await writeFile(filePath, staged, "utf8");
  git(directory, ["add", "sample.ts"]);
  await writeFile(filePath, working, "utf8");

  runScript(directory, "format-staged.mjs");

  assert.equal(
    git(directory, ["show", ":sample.ts"]),
    "const first = { a: 1, b: 2 };\n",
  );
  assert.equal(await readFile(filePath, "utf8"), working);
});
