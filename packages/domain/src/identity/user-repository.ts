import type { ApplicationError, Result } from "../foundation/contracts.ts";
import type { User } from "./user.ts";

export type UserRepositoryCreateError = ApplicationError<"already_exists">;

export interface UserRepository {
  create(user: User): Promise<Result<User, UserRepositoryCreateError>>;
}
