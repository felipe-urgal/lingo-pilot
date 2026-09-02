export { FakeClock } from "./clock.ts";
export { DeterministicIdGenerator } from "./id-generator.ts";
export { buildUser, FakeUserRepository } from "./identity.ts";
export { ScriptedProviderFake } from "./scripted-provider-fake.ts";

export const packageBoundary = "test-support" as const;
