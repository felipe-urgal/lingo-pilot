import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { format, getFileInfo, resolveConfig } from "prettier";

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    ...options,
  });
}

function stagedFiles() {
  return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
    .split("\0")
    .filter(Boolean);
}

function stagedContent(filePath) {
  return git(["show", `:${filePath}`]);
}

function stagedMode(filePath) {
  return git(["ls-files", "-s", "--", filePath]).trim().split(/\s+/)[0];
}

function replaceIndexEntry(filePath, content) {
  const mode = stagedMode(filePath);
  const blobSha = git(["hash-object", "-w", "--stdin"], {
    input: content,
  }).trim();
  execFileSync(
    "git",
    ["update-index", "--cacheinfo", `${mode},${blobSha},${filePath}`],
    { stdio: "inherit" },
  );
}

async function syncWorkingTreeWhenSafe(filePath, before, after) {
  try {
    const workingTreeContent = await readFile(filePath, "utf8");
    if (workingTreeContent === before) {
      await writeFile(filePath, after, "utf8");
    }
  } catch {
    // The index is authoritative for the commit. Deleted/missing worktree files are ignored.
  }
}

export async function formatStagedFiles() {
  const repositoryRoot = git(["rev-parse", "--show-toplevel"]).trim();
  process.chdir(repositoryRoot);

  const formattedFiles = [];
  for (const filePath of stagedFiles()) {
    const fileInfo = await getFileInfo(filePath, {
      ignorePath: ".prettierignore",
    });
    if (fileInfo.ignored || !fileInfo.inferredParser) continue;

    const before = stagedContent(filePath);
    const config = (await resolveConfig(filePath)) ?? {};
    const after = await format(before, {
      ...config,
      filepath: filePath,
    });
    if (after === before) continue;

    replaceIndexEntry(filePath, after);
    await syncWorkingTreeWhenSafe(filePath, before, after);
    formattedFiles.push(filePath);
  }

  if (formattedFiles.length > 0) {
    console.log(
      `Prettier aplicou formatação staged em ${formattedFiles.length} arquivo(s):`,
    );
    for (const filePath of formattedFiles) console.log(`- ${filePath}`);
  }
}

await formatStagedFiles();
