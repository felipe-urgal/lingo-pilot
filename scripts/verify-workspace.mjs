import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

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
const violation = forbiddenDomainDeps.find((dependency) => dependency in domainDeps);

if (violation) {
  throw new Error(`@lingo-pilot/domain must not depend on ${violation}`);
}

console.log("Workspace boundaries verified.");
