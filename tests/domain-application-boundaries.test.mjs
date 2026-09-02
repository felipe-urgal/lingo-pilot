import assert from "node:assert/strict";
import { test } from "node:test";
import { createUserIdentity } from "../apps/web/server/application/create-user-identity.ts";
import { err, ok } from "../packages/domain/src/index.ts";

class FakeUserRepository {
  #users = new Map();

  async create(user) {
    if (this.#users.has(user.id)) {
      return err({ code: "already_exists" });
    }

    this.#users.set(user.id, user);
    return ok(user);
  }

  get(userId) {
    return this.#users.get(userId) ?? null;
  }
}

test("application use case is deterministic with fake ports", async () => {
  const now = new Date("2026-09-02T15:30:00.000Z");
  const users = new FakeUserRepository();
  const execute = createUserIdentity({
    clock: { now: () => now },
    idGenerator: { generate: () => "user-fixed" },
    users,
  });

  const result = await execute();

  assert.equal(result.ok, true);
  assert.equal(result.value.id, "user-fixed");
  assert.equal(result.value.createdAt.toISOString(), now.toISOString());
  assert.notEqual(result.value.createdAt, now);
  assert.equal(users.get("user-fixed")?.id, "user-fixed");
});

test("expected repository conflicts become typed application errors", async () => {
  const users = new FakeUserRepository();
  const execute = createUserIdentity({
    clock: { now: () => new Date("2026-09-02T15:30:00.000Z") },
    idGenerator: { generate: () => "duplicate-user" },
    users,
  });

  assert.equal((await execute()).ok, true);
  assert.deepEqual(await execute(), {
    error: { code: "identity_already_exists" },
    ok: false,
  });
});
