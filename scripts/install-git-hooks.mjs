import { execFileSync } from "node:child_process";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MANAGED_MARKER = "# managed by lingo-pilot";
const PRE_COMMIT_HOOK = `#!/bin/sh
${MANAGED_MARKER}
exec pnpm format:staged
`;

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function gitHooksDirectory() {
  return execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export async function installGitHooks() {
  let hooksDirectory;
  try {
    hooksDirectory = gitHooksDirectory();
  } catch {
    return { installed: false, reason: "not-a-git-repository" };
  }

  const hookPath = path.resolve(hooksDirectory, "pre-commit");
  if (await fileExists(hookPath)) {
    const existing = await readFile(hookPath, "utf8");
    if (!existing.includes(MANAGED_MARKER)) {
      console.warn(
        "LingoPilot: pre-commit hook existente não gerenciado; instalação automática ignorada.",
      );
      return { installed: false, reason: "unmanaged-hook-exists" };
    }
  }

  await mkdir(path.dirname(hookPath), { recursive: true });
  await writeFile(hookPath, PRE_COMMIT_HOOK, "utf8");
  await chmod(hookPath, 0o755);
  console.log("LingoPilot: pre-commit hook de formatação instalado.");
  return { installed: true, reason: "installed" };
}

await installGitHooks();
