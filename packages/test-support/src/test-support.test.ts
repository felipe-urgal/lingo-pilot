import { describe, expect, test } from "vitest";
import {
  buildUser,
  DeterministicIdGenerator,
  FakeClock,
  FakeUserRepository,
  ScriptedProviderFake,
} from "./index.ts";

describe("deterministic test support", () => {
  test("clock can advance without using wall time", () => {
    const clock = new FakeClock(new Date("2026-09-02T10:00:00.000Z"));
    const exposed = clock.now();
    exposed.setUTCFullYear(2030);

    expect(clock.now().toISOString()).toBe("2026-09-02T10:00:00.000Z");
    expect(clock.advanceBy(90_000).toISOString()).toBe(
      "2026-09-02T10:01:30.000Z",
    );
  });

  test("ID generation is stable and sequential", () => {
    const ids = new DeterministicIdGenerator("learner");

    expect(ids.generate()).toBe("learner-0001");
    expect(ids.generate()).toBe("learner-0002");
  });

  test("user factory is valid by default and supports overrides", () => {
    expect(buildUser()).toEqual({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "user-test-0001",
    });
    expect(buildUser({ id: "user-custom" }).id).toBe("user-custom");
  });

  test("repository fake implements the real repository contract", async () => {
    const repository = new FakeUserRepository();
    const user = buildUser();

    expect(await repository.create(user)).toEqual({ ok: true, value: user });
    expect(repository.find(user.id)).toEqual(user);
    expect(await repository.create(user)).toEqual({
      error: { code: "already_exists" },
      ok: false,
    });
  });

  test("provider fake returns only scripted responses and records calls", async () => {
    const provider = new ScriptedProviderFake<string, string>([
      () => "synthetic-response",
    ]);

    await expect(provider.execute("synthetic-input")).resolves.toBe(
      "synthetic-response",
    );
    expect(provider.calls).toEqual(["synthetic-input"]);
    await expect(provider.execute("unexpected-call")).rejects.toThrow(
      "No scripted provider response remains",
    );
  });
});
