import {
  err,
  ok,
  type Result,
  type User,
  type UserRepository,
  type UserRepositoryCreateError,
} from "../../../domain/src/index.ts";
import type { Database } from "../client.ts";
import { users } from "../schema.ts";

export class PostgresUserRepository implements UserRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async create(user: User): Promise<Result<User, UserRepositoryCreateError>> {
    const [created] = await this.database
      .insert(users)
      .values({
        createdAt: user.createdAt,
        id: user.id,
        updatedAt: user.createdAt,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      return err<UserRepositoryCreateError>({ code: "already_exists" });
    }

    return ok({
      createdAt: created.createdAt,
      id: created.id,
    });
  }
}
