import {
  createAuthSession,
  createDatabaseClient,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  findOwnershipFixtureForUser,
  revokeAuthSessionByTokenHash,
  updateOwnershipFixtureForUser,
  type Database,
  type DatabaseClient,
} from "../../../packages/db/src/index.ts";
import { serverConfig } from "../config/server";

const globalDatabase = globalThis as typeof globalThis & {
  lingoPilotDatabaseClient?: DatabaseClient;
};

export function getDatabaseClient(): DatabaseClient {
  if (!globalDatabase.lingoPilotDatabaseClient) {
    globalDatabase.lingoPilotDatabaseClient = createDatabaseClient(
      serverConfig.database.url,
      { applicationName: "lingo-pilot-web" },
    );
  }

  return globalDatabase.lingoPilotDatabaseClient;
}

export function getDatabase(): Database {
  return getDatabaseClient().db;
}

export {
  createAuthSession,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  findOwnershipFixtureForUser,
  revokeAuthSessionByTokenHash,
  updateOwnershipFixtureForUser,
};

export type { Database };
