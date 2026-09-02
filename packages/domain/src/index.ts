/** Pure domain boundary. Framework and infrastructure dependencies are forbidden here. */
export {
  err,
  ok,
  type ApplicationError,
  type Clock,
  type IdGenerator,
  type Result,
} from "./foundation/contracts.ts";
export type { User } from "./identity/user.ts";
export type {
  UserRepository,
  UserRepositoryCreateError,
} from "./identity/user-repository.ts";

export const packageBoundary = "domain" as const;
