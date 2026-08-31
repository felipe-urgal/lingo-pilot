const RUNTIME_PROFILES = new Set(["development", "e2e", "test", "production"]);

export const WEB_HOST = "127.0.0.1";
export const WEB_PORT = 5400;
export const E2E_PORT = 5401;
export const DATABASE_HOST = "127.0.0.1";
export const DATABASE_PORT = 5435;
export const DEFAULT_TIME_ZONE = "UTC";

export class EnvironmentValidationError extends Error {
  constructor(message, key) {
    super(key ? `[${key}] ${message}` : message);
    this.name = "EnvironmentValidationError";
    this.key = key;
  }
}

function requireString(value, key) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new EnvironmentValidationError("value is required", key);
  }

  return value.trim();
}

function parseHttpBaseUrl(value, key) {
  const rawValue = requireString(value, key);
  let parsed;

  try {
    parsed = new URL(rawValue);
  } catch {
    throw new EnvironmentValidationError(
      "must be an absolute HTTP(S) URL",
      key,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new EnvironmentValidationError("must use http or https", key);
  }

  if (parsed.username || parsed.password) {
    throw new EnvironmentValidationError("must not contain credentials", key);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new EnvironmentValidationError(
      "must be an origin only, without path, query string or hash",
      key,
    );
  }

  return parsed.origin;
}

function parseBoolean(value, key, defaultValue) {
  if (value === undefined || value === "") return defaultValue;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  throw new EnvironmentValidationError(
    "must be one of true/false, 1/0, yes/no or on/off",
    key,
  );
}

function parseTimeZone(value) {
  const timeZone = value?.trim() || DEFAULT_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new EnvironmentValidationError(
      "must be a valid IANA timezone",
      "APP_TIMEZONE",
    );
  }

  return timeZone;
}

function resolveRuntimeProfile(source) {
  const explicitProfile = source.LINGO_PROFILE?.trim();

  if (explicitProfile) {
    if (!RUNTIME_PROFILES.has(explicitProfile)) {
      throw new EnvironmentValidationError(
        `must be one of ${[...RUNTIME_PROFILES].join(", ")}`,
        "LINGO_PROFILE",
      );
    }

    return explicitProfile;
  }

  if (source.NODE_ENV === "production") return "production";
  if (source.NODE_ENV === "test") return "test";
  return "development";
}

function parseDatabaseUrl(value, key) {
  const rawValue = requireString(value, key);
  let parsed;

  try {
    parsed = new URL(rawValue);
  } catch {
    throw new EnvironmentValidationError(
      "must be an absolute PostgreSQL URL",
      key,
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new EnvironmentValidationError(
      "must use postgres or postgresql protocol",
      key,
    );
  }

  let databaseName;

  try {
    databaseName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new EnvironmentValidationError(
      "contains an invalid encoded database name",
      key,
    );
  }

  if (!parsed.hostname || !databaseName || databaseName.includes("/")) {
    throw new EnvironmentValidationError(
      "must include a host and a single database name",
      key,
    );
  }

  return { databaseName, parsed, url: rawValue };
}

function effectiveDatabasePort(parsed) {
  return parsed.port ? Number(parsed.port) : 5432;
}

function databaseIdentity(database) {
  return [
    database.parsed.hostname,
    effectiveDatabasePort(database.parsed),
    database.databaseName,
  ].join(":");
}

function enforceLocalDatabaseEndpoint(database, key, profile) {
  if (profile !== "development" && profile !== "e2e") return;

  if (database.parsed.hostname !== DATABASE_HOST) {
    throw new EnvironmentValidationError(
      `${profile} must use database host ${DATABASE_HOST}`,
      key,
    );
  }

  if (effectiveDatabasePort(database.parsed) !== DATABASE_PORT) {
    throw new EnvironmentValidationError(
      `${profile} must use database port ${DATABASE_PORT}`,
      key,
    );
  }
}

export function parseDatabaseEnvironment(source) {
  const profile = resolveRuntimeProfile(source);
  const database = parseDatabaseUrl(source.DATABASE_URL, "DATABASE_URL");
  enforceLocalDatabaseEndpoint(database, "DATABASE_URL", profile);

  return Object.freeze({ url: database.url });
}

export function parseTestDatabaseEnvironment(source) {
  const profile = resolveRuntimeProfile(source);
  const testDatabase = parseDatabaseUrl(
    source.TEST_DATABASE_URL,
    "TEST_DATABASE_URL",
  );
  enforceLocalDatabaseEndpoint(testDatabase, "TEST_DATABASE_URL", profile);

  if (!testDatabase.databaseName.toLowerCase().includes("test")) {
    throw new EnvironmentValidationError(
      "database name must contain 'test' to protect non-test data",
      "TEST_DATABASE_URL",
    );
  }

  if (source.DATABASE_URL?.trim()) {
    const runtimeDatabase = parseDatabaseUrl(source.DATABASE_URL, "DATABASE_URL");

    if (databaseIdentity(runtimeDatabase) === databaseIdentity(testDatabase)) {
      throw new EnvironmentValidationError(
        "must not point to the same database as DATABASE_URL",
        "TEST_DATABASE_URL",
      );
    }
  }

  return Object.freeze({ url: testDatabase.url });
}

export function canonicalAppUrl(profile) {
  if (profile === "dev") return `http://${WEB_HOST}:${WEB_PORT}`;
  if (profile === "e2e") return `http://${WEB_HOST}:${E2E_PORT}`;

  throw new EnvironmentValidationError(
    "web profile must be dev or e2e",
    "LINGO_PROFILE",
  );
}

export function createWebProfileEnvironment(profile) {
  if (profile === "dev") {
    return Object.freeze({
      LINGO_PROFILE: "development",
      LINGO_TEST_MODE: "false",
      NEXT_PUBLIC_APP_URL: canonicalAppUrl("dev"),
    });
  }

  if (profile === "e2e") {
    return Object.freeze({
      LINGO_PROFILE: "e2e",
      LINGO_TEST_MODE: "true",
      NEXT_PUBLIC_APP_URL: canonicalAppUrl("e2e"),
    });
  }

  throw new EnvironmentValidationError(
    "web profile must be dev or e2e",
    "LINGO_PROFILE",
  );
}

export function parsePublicEnvironment(source) {
  return Object.freeze({
    appUrl: parseHttpBaseUrl(source.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL"),
  });
}

export function parseServerEnvironment(source) {
  const publicConfig = parsePublicEnvironment(source);
  const database = parseDatabaseEnvironment(source);
  const profile = resolveRuntimeProfile(source);
  const timeZone = parseTimeZone(source.APP_TIMEZONE);
  const testMode = parseBoolean(
    source.LINGO_TEST_MODE,
    "LINGO_TEST_MODE",
    false,
  );

  if (
    profile === "development" &&
    publicConfig.appUrl !== canonicalAppUrl("dev")
  ) {
    throw new EnvironmentValidationError(
      `development must use ${canonicalAppUrl("dev")}`,
      "NEXT_PUBLIC_APP_URL",
    );
  }

  if (profile === "e2e") {
    if (publicConfig.appUrl !== canonicalAppUrl("e2e")) {
      throw new EnvironmentValidationError(
        `e2e must use ${canonicalAppUrl("e2e")}`,
        "NEXT_PUBLIC_APP_URL",
      );
    }

    if (!testMode) {
      throw new EnvironmentValidationError(
        "must be true for the e2e profile",
        "LINGO_TEST_MODE",
      );
    }
  }

  if ((profile === "development" || profile === "production") && testMode) {
    throw new EnvironmentValidationError(
      `must be false for the ${profile} profile`,
      "LINGO_TEST_MODE",
    );
  }

  return Object.freeze({
    database,
    profile,
    timeZone,
    testMode,
    public: publicConfig,
  });
}
