const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

const PRODUCTION_ONLY_VARIABLES = [
  "DATABASE_DIRECT_URL",
  "LINGO_PRODUCTION_READY_URL",
  "VERCEL_TOKEN",
  "VERCEL_TEAM_ID",
  "VERCEL_PROJECT_ID",
];

function requiredValue(environment, key) {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`${key} é obrigatório.`);
  return value;
}

function parsePostgresUrl(value, key) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} precisa ser uma URL PostgreSQL válida.`);
  }

  if (!POSTGRES_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${key} precisa usar postgres:// ou postgresql://.`);
  }

  if (!url.hostname || !url.pathname || url.pathname === "/") {
    throw new Error(`${key} precisa identificar host e database.`);
  }

  return url;
}

export function createCheckEnvironment(environment = process.env) {
  const runtimeUrl = requiredValue(environment, "CHECK_DATABASE_URL");
  const testUrl = requiredValue(environment, "CHECK_TEST_DATABASE_URL");
  parsePostgresUrl(runtimeUrl, "CHECK_DATABASE_URL");
  parsePostgresUrl(testUrl, "CHECK_TEST_DATABASE_URL");

  if (runtimeUrl === testUrl) {
    throw new Error("CHECK_DATABASE_URL e CHECK_TEST_DATABASE_URL devem ser diferentes.");
  }

  const result = {
    ...environment,
    APP_TIMEZONE: environment.APP_TIMEZONE?.trim() || "UTC",
    DATABASE_URL: runtimeUrl,
    LINGO_PROFILE: "test",
    LINGO_TEST_MODE: "false",
    NEXT_PUBLIC_APP_URL:
      environment.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:5400",
    TEST_DATABASE_URL: testUrl,
  };

  delete result.CHECK_DATABASE_URL;
  delete result.CHECK_TEST_DATABASE_URL;
  for (const variable of PRODUCTION_ONLY_VARIABLES) delete result[variable];
  return result;
}

export function productionDatabaseEnvironment(environment = process.env) {
  const directUrl = requiredValue(environment, "DATABASE_DIRECT_URL");
  parsePostgresUrl(directUrl, "DATABASE_DIRECT_URL");

  return {
    ...environment,
    DATABASE_URL: directUrl,
    LINGO_PROFILE: "production",
    LINGO_TEST_MODE: "false",
  };
}

export function productionReadyUrl(environment = process.env) {
  const value = requiredValue(environment, "LINGO_PRODUCTION_READY_URL");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("LINGO_PRODUCTION_READY_URL precisa ser uma URL HTTPS válida.");
  }

  if (url.protocol !== "https:") {
    throw new Error("LINGO_PRODUCTION_READY_URL precisa usar https://.");
  }

  return url;
}

export function parsedProductionDatabase(environment = process.env) {
  const directUrl = requiredValue(environment, "DATABASE_DIRECT_URL");
  return parsePostgresUrl(directUrl, "DATABASE_DIRECT_URL");
}
