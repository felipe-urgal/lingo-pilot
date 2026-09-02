/** Runtime persistence surface for application delivery code. Excludes migration tooling. */
export {
  createDatabaseClient,
  type Database,
  type DatabaseClient,
} from "./client.ts";
export {
  createAuthSession,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  revokeAuthSessionByTokenHash,
} from "./auth.ts";
export {
  findOwnershipFixtureForUser,
  updateOwnershipFixtureForUser,
} from "./ownership.ts";
