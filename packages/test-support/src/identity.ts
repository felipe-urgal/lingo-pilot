import {
  err,
  ok,
  type Result,
  type User,
  type UserRepository,
  type UserRepositoryCreateError,
} from "@lingo-pilot/domain";

const DEFAULT_CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

export function buildUser(overrides: Partial<User> = {}): User {
  const createdAt = overrides.createdAt ?? DEFAULT_CREATED_AT;

  return {
    createdAt: new Date(createdAt.getTime()),
    id: overrides.id ?? "user-test-0001",
  };
}

export class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(user: User): Promise<Result<User, UserRepositoryCreateError>> {
    if (this.users.has(user.id)) {
      return err<UserRepositoryCreateError>({ code: "already_exists" });
    }

    const stored = buildUser(user);
    this.users.set(stored.id, stored);
    return ok(buildUser(stored));
  }

  find(userId: string): User | null {
    const user = this.users.get(userId);
    return user ? buildUser(user) : null;
  }

  clear(): void {
    this.users.clear();
  }
}
