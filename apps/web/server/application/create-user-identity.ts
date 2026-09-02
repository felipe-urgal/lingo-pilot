import {
  err,
  ok,
  type ApplicationError,
  type Clock,
  type IdGenerator,
  type Result,
  type User,
  type UserRepository,
} from "../../../../packages/domain/src/index.ts";

export interface CreateUserIdentityDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly users: UserRepository;
}

export type CreateUserIdentityError =
  ApplicationError<"identity_already_exists">;

export function createUserIdentity(
  dependencies: CreateUserIdentityDependencies,
) {
  return async function execute(): Promise<
    Result<User, CreateUserIdentityError>
  > {
    const now = dependencies.clock.now();
    const user: User = {
      createdAt: new Date(now.getTime()),
      id: dependencies.idGenerator.generate(),
    };
    const persisted = await dependencies.users.create(user);

    if (!persisted.ok) {
      return err<CreateUserIdentityError>({
        code: "identity_already_exists",
      });
    }

    return ok(persisted.value);
  };
}
