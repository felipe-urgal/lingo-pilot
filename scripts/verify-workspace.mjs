import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const packageNames = [
  "ai",
  "config",
  "content",
  "db",
  "domain",
  "learning",
  "test-support",
  "ui",
];

for (const packageName of packageNames) {
  const manifestPath = resolve("packages", packageName, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedName = `@lingo-pilot/${packageName}`;

  if (manifest.name !== expectedName) {
    throw new Error(`${manifestPath} must declare ${expectedName}`);
  }
}

const domainManifest = JSON.parse(
  await readFile(resolve("packages/domain/package.json"), "utf8"),
);
const domainDeps = {
  ...domainManifest.dependencies,
  ...domainManifest.peerDependencies,
};
const forbiddenDomainDeps = ["next", "react", "react-dom", "drizzle-orm"];
const violation = forbiddenDomainDeps.find(
  (dependency) => dependency in domainDeps,
);

if (violation) {
  throw new Error(`@lingo-pilot/domain must not depend on ${violation}`);
}

function isInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot === "" ||
    (pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`))
  );
}

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractImportSpecifiers(source) {
  return [...source.matchAll(/\b(?:from|import)\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter(Boolean);
}

async function verifyDomainSourceBoundary() {
  const domainRoot = resolve("packages/domain/src");
  const files = await listTypeScriptFiles(domainRoot);

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const specifier of extractImportSpecifiers(source)) {
      if (!specifier.startsWith(".")) {
        throw new Error(`Domain source cannot import ${specifier}: ${file}`);
      }

      const target = resolve(dirname(file), specifier);
      if (!isInside(domainRoot, target)) {
        throw new Error(`Domain source cannot escape its package: ${file}`);
      }
    }
  }
}

async function verifyApplicationSourceBoundary() {
  const applicationRoot = resolve("apps/web/server/application");
  const databaseRoot = resolve("packages/db");
  const forbiddenPackages = ["next", "react", "react-dom", "drizzle-orm"];
  const files = await listTypeScriptFiles(applicationRoot);

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const specifier of extractImportSpecifiers(source)) {
      const importsForbiddenPackage = forbiddenPackages.some(
        (name) => specifier === name || specifier.startsWith(`${name}/`),
      );
      if (importsForbiddenPackage) {
        throw new Error(
          `Application use case cannot import ${specifier}: ${file}`,
        );
      }

      if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier);
        if (isInside(databaseRoot, target)) {
          throw new Error(
            `Application use case cannot import database code: ${file}`,
          );
        }
      }
    }
  }
}

await verifyDomainSourceBoundary();
await verifyApplicationSourceBoundary();

console.log("Workspace boundaries verified.");
