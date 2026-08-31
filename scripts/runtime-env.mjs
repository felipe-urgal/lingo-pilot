import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

export const LOCAL_ENV_FILE = ".env.local";

function isMissingFileError(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT",
  );
}

export async function resolveRuntimeEnvironment({
  environment = process.env,
  envFile = LOCAL_ENV_FILE,
} = {}) {
  let fileEnvironment = {};
  let source = "process environment";

  try {
    const contents = await readFile(envFile, "utf8");
    fileEnvironment = parseEnv(contents);
    source = `${envFile} + process environment`;
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }

  return Object.freeze({
    environment: Object.freeze({
      ...fileEnvironment,
      ...environment,
    }),
    source,
  });
}
