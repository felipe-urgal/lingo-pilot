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
import { PostgresSessionExecutionRepository } from "../src/repositories/postgres-session-execution-repository.ts";
import { PostgresStudyRepository } from "../src/repositories/postgres-study-repository.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-session-execution-test",
  maxConnections: 4,
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

async function createEnrollment() {
  const suffix = randomUUID();
  const userId = `execution-${suffix}`;
  await createUser(client.db, userId);
  const journeys = new PostgresLearnerJourneyRepository(client.db);
  const journey = await journeys.saveInitial({
    learnerProfile: {
      userId,
      interfaceLocale: "pt-BR",
      timezone: "America/Sao_Paulo",
      dailyGoalMinutes: 20,
      primaryGoal: "conversation",
    },
    languageProfile: {
      id: `language-${suffix}`,
      userId,
      sourceLanguage: "pt-BR",
      targetLanguage: "en",
      startingLevel: "A0",
      currentEstimatedLevel: null,
      status: "active",
    },
    enrollment: {
      id: `enrollment-${suffix}`,
      courseId: "course.en.ptbr.v1",
      entryPointLevel: "A0",
      placementSource: "zero",
      status: "active",
    },
    now: new Date("2026-09-03T12:00:00.000Z"),
  });
  return journey.enrollment.id;
}

function lessonItem(id, resourceId) {
  return {
    id,
    kind: "lesson",
    resourceId,
    schemaVersion: 1,
    revision: 1,
    reasonCode: "NEW_ELIGIBLE_LESSON",
    eligibilityReason: "progress-satisfied",
    estimatedMinutes: 3,
  };
}

test("keeps the latest open persisted session authoritative across a new local day", async () => {
  const enrollmentId = await createEnrollment();
  const study = new PostgresStudyRepository(client.db);
  const execution = new PostgresSessionExecutionRepository(client.db);
  const suffix = randomUUID();
  const persisted = await study.ensureDailySession({
    sessionId: `session-${suffix}`,
    enrollmentId,
    localStudyDate: "2026-09-03",
    plannerVersion: "daily-session-v1",
    items: [lessonItem(`item-${suffix}`, "lesson.a0.bootstrap.orientation")],
    now: new Date("2026-09-03T23:59:00.000Z"),
  });

  const resumed = await execution.findLatestOpenSession(enrollmentId);

  assert.equal(resumed?.id, persisted.id);
  assert.equal(resumed?.localStudyDate, "2026-09-03");
  assert.equal(resumed?.status, "planned");
});

test("skips unavailable work idempotently and completes only when every persisted item is terminal", async () => {
  const enrollmentId = await createEnrollment();
  const study = new PostgresStudyRepository(client.db);
  const execution = new PostgresSessionExecutionRepository(client.db);
  const suffix = randomUUID();
  const firstItemId = `item-stale-${suffix}`;
  const secondItemId = `item-valid-${suffix}`;
  const session = await study.ensureDailySession({
    sessionId: `session-${suffix}`,
    enrollmentId,
    localStudyDate: "2026-09-04",
    plannerVersion: "daily-session-v1",
    items: [
      lessonItem(firstItemId, "lesson.stale"),
      lessonItem(secondItemId, "lesson.a0.bootstrap.orientation"),
    ],
    now: new Date("2026-09-04T12:00:00.000Z"),
  });

  const skipped = await execution.skipSessionItem({
    enrollmentId,
    sessionId: session.id,
    itemId: firstItemId,
    now: new Date("2026-09-04T12:01:00.000Z"),
  });
  assert.equal(skipped.ok, true);
  assert.equal(skipped.ok && skipped.duplicate, false);
  assert.equal(skipped.ok && skipped.session.status, "in_progress");
  assert.deepEqual(
    skipped.ok && skipped.session.items.map((item) => item.status),
    ["skipped", "planned"],
  );

  const retried = await execution.skipSessionItem({
    enrollmentId,
    sessionId: session.id,
    itemId: firstItemId,
    now: new Date("2026-09-04T12:02:00.000Z"),
  });
  assert.equal(retried.ok, true);
  assert.equal(retried.ok && retried.duplicate, true);

  await client.pool.query(
    "update session_items set status = 'completed', updated_at = $1 where id = $2",
    [new Date("2026-09-04T12:03:00.000Z"), secondItemId],
  );
  const finalized = await execution.finalizeSessionContainingItem({
    enrollmentId,
    itemId: secondItemId,
    now: new Date("2026-09-04T12:03:00.000Z"),
  });

  assert.equal(finalized?.status, "completed");
  assert.deepEqual(
    finalized?.items.map((item) => item.status),
    ["skipped", "completed"],
  );
  assert.ok(finalized?.completedAt instanceof Date);
});
