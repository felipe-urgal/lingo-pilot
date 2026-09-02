import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import {
  createDatabaseClient,
  createUser,
  migrateDatabase,
} from "../src/index.ts";
import { PostgresLearnerJourneyRepository } from "../src/repositories/postgres-learner-journey-repository.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-learner-journey-test",
  maxConnections: 2,
});

before(async () => {
  await client.pool.query("drop schema if exists drizzle cascade");
  await client.pool.query("drop schema if exists public cascade");
  await client.pool.query("create schema public");
  await migrateDatabase(client.db);
});

after(async () => {
  await client.close();
});

function inputFor(userId, suffix, overrides = {}) {
  const now = new Date("2026-09-02T18:00:00.000Z");
  return {
    learnerProfile: {
      userId,
      interfaceLocale: "pt-BR",
      timezone: "America/Sao_Paulo",
      dailyGoalMinutes: 20,
      primaryGoal: "conversation",
      ...overrides.learnerProfile,
    },
    languageProfile: {
      id: `language-${suffix}`,
      userId,
      sourceLanguage: "pt-BR",
      targetLanguage: "en",
      startingLevel: "A0",
      currentEstimatedLevel: null,
      status: "active",
      ...overrides.languageProfile,
    },
    enrollment: {
      id: `enrollment-${suffix}`,
      courseId: "course.en.ptbr.v1",
      entryPointLevel: "A0",
      placementSource: "zero",
      status: "active",
      ...overrides.enrollment,
    },
    now,
  };
}

test("creates learner profile, language profile and enrollment atomically and idempotently", async () => {
  const suffix = randomUUID();
  const userId = `learner-${suffix}`;
  await createUser(client.db, userId);
  const repository = new PostgresLearnerJourneyRepository(client.db);

  const first = await repository.saveInitial(inputFor(userId, suffix));
  const retried = await repository.saveInitial(
    inputFor(userId, `retry-${suffix}`, {
      learnerProfile: { dailyGoalMinutes: 30 },
    }),
  );

  assert.equal(retried.languageProfile.id, first.languageProfile.id);
  assert.equal(retried.enrollment.id, first.enrollment.id);
  assert.equal(retried.learnerProfile.dailyGoalMinutes, 30);

  const counts = await client.pool.query(
    `select
      (select count(*)::int from learner_profiles where user_id = $1) as learner_profiles,
      (select count(*)::int from language_profiles where user_id = $1) as language_profiles,
      (select count(*)::int from enrollments e join language_profiles lp on lp.id = e.language_profile_id where lp.user_id = $1) as enrollments`,
    [userId],
  );
  assert.equal(counts.rows[0]?.learner_profiles, 1);
  assert.equal(counts.rows[0]?.language_profiles, 1);
  assert.equal(counts.rows[0]?.enrollments, 1);
});

test("isolates learner journey reads by authenticated user ownership", async () => {
  const suffix = randomUUID();
  const ownerId = `owner-${suffix}`;
  const otherId = `other-${suffix}`;
  await createUser(client.db, ownerId);
  await createUser(client.db, otherId);
  const repository = new PostgresLearnerJourneyRepository(client.db);

  await repository.saveInitial(inputFor(ownerId, suffix));

  assert.ok(await repository.findForUser(ownerId));
  assert.equal(await repository.findForUser(otherId), null);
});

test("database rejects inconsistent placement source semantics", async () => {
  const suffix = randomUUID();
  const userId = `invalid-placement-${suffix}`;
  await createUser(client.db, userId);
  const repository = new PostgresLearnerJourneyRepository(client.db);

  await assert.rejects(
    repository.saveInitial(
      inputFor(userId, suffix, {
        languageProfile: { startingLevel: "A1" },
        enrollment: { entryPointLevel: "A1", placementSource: "zero" },
      }),
    ),
  );

  assert.equal(await repository.findForUser(userId), null);
});
