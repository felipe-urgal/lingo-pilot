import { readFile, readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentInputs } from "../src/validator.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(packageRoot, "../..");
const defaultContentRoot = resolve(repositoryRoot, "content");
const requestedRoot = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : defaultContentRoot;

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function listJsonFiles(path) {
  const metadata = await stat(path);
  if (metadata.isFile()) return path.endsWith(".json") ? [path] : [];
  if (!metadata.isDirectory()) return [];

  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.toSorted((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...(await listJsonFiles(entryPath)));
    else if (entry.isFile() && entry.name.endsWith(".json"))
      files.push(entryPath);
  }
  return files;
}

function displayPath(path) {
  const repositoryPath = relative(repositoryRoot, path);
  return repositoryPath.startsWith("..") ? path : repositoryPath;
}

async function loadInputs(files) {
  const inputs = [];
  const issues = [];

  for (const file of files) {
    const displayFile = displayPath(file);
    const source = await readFile(file, "utf8");
    try {
      inputs.push({ file: displayFile, value: JSON.parse(source) });
    } catch (error) {
      issues.push({
        file: displayFile,
        path: "$",
        rule: "JSON_PARSE",
        message: error instanceof Error ? error.message : "Invalid JSON.",
      });
    }
  }

  return { inputs, issues };
}

if (!(await pathExists(requestedRoot))) {
  if (process.argv[2]) {
    console.error(`Content path does not exist: ${requestedRoot}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Content validation passed: no authored content directory yet.",
    );
  }
} else {
  const files = await listJsonFiles(requestedRoot);
  const loaded = await loadInputs(files);
  const result = validateContentInputs(loaded.inputs);
  const issues = [...loaded.issues, ...result.issues];

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(
        `${issue.file}:${issue.path} [${issue.rule}] ${issue.message}`,
      );
    }
    console.error(
      `Content validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Content validation passed: ${result.documents.length} document${result.documents.length === 1 ? "" : "s"} checked.`,
    );
  }
}
