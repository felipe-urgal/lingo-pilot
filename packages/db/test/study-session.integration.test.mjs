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
import { PostgresStudyRepository } from "../src/repositories/postgres-study-repository.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-study-session-test",
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
  const userId = `study-${suffix}`;
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

function sessionInput(enrollmentId, suffix) {
  return {
    sessionId: `session-${suffix}`,
    itemId: `item-${suffix}`,
    enrollmentId,
    localStudyDate: "2026-09-03",
    plannerVersion: "today-shell-v1",
    lessonId: "lesson.a0.bootstrap.orientation",
    contentSchemaVersion: 1,
    contentRevision: 1,
    estimatedMinutes: 3,
    eligibilityReason: "progress-satisfied",
    now: new Date("2026-09-03T12:30:00.000Z"),
  };
}

test("creates only one daily session under concurrent generation", async () => {
  const enrollmentId = await createEnrollment();
  const repository = new PostgresStudyRepository(client.db);

  const [first, second] = await Promise.all([
    repository.ensureDailySession(sessionInput(enrollmentId, randomUUID())),
    repository.ensureDailySession(sessionInput(enrollmentId, randomUUID())),
  ]);

  assert.equal(first.id, second.id);
  assert.equal(first.items.length, 1);
  assert.equal(second.items.length, 1);

  const counts = await client.pool.query(
    `select
      (select count(*)::int from study_sessions where enrollment_id = $1) as sessions,
      (select count(*)::int from session_items i join study_sessions s on s.id = i.study_session_id where s.enrollment_id = $1) as items`,
    [enrollmentId],
  );
  assert.equal(counts.rows[0]?.sessions, 1);
  assert.equal(counts.rows[0]?.items, 1);
});

test("persists safe resume position and explicit completion against the authored revision", async () => {
  const enrollmentId = await createEnrollment();
  const repository = new PostgresStudyRepository(client.db);
  const session = await repository.ensureDailySession(
    sessionInput(enrollmentId, randomUUID()),
  );
  const item = session.items[0];
  assert.ok(item);

  const started = await repository.startSessionItem({
    enrollmentId,
    sessionId: session.id,
    itemId: item.id,
    lessonId: item.resourceId,
    contentSchemaVersion: item.schemaVersion,
    contentRevision: item.revision,
    now: new Date("2026-09-03T12:31:00.000Z"),
  });
  assert.equal(started.ok, true);

  const saved = await repository.saveLessonPosition({
    enrollmentId,
    lessonId: item.resourceId,
    contentSchemaVersion: item.schemaVersion,
    contentRevision: item.revision,
    expectedBlockIndex: 0,
    currentBlockIndex: 1,
    now: new Date("2026-09-03T12:32:00.000Z"),
  });
  assert.equal(saved.ok, true);
  if (saved.ok) assert.equal(saved.value.currentBlockIndex, 1);

  const duplicate = await repository.saveLessonPosition({
    enrollmentId,
    lessonId: item.resourceId,
    contentSchemaVersion: item.schemaVersion,
    contentRevision: item.revision,
    expectedBlockIndex: 0,
    currentBlockIndex: 1,
    now: new Date("2026-09-03T12:32:01.000Z"),
  });
  assert.deepEqual(duplicate, { ok: false, reason: "invalid-state" });

  const completed = await repository.completeLesson({
    enrollmentId,
    sessionId: session.id,
    itemId: item.id,
    lessonId: item.resourceId,
    contentSchemaVersion: item.schemaVersion,
    contentRevision: item.revision,
    now: new Date("2026-09-03T12:33:00.000Z"),
  });
  assert.equal(completed.ok, true);
  if (completed.ok) assert.equal(completed.value.status, "completed");

  const progress = await repository.listLessonProgress(enrollmentId);
  assert.equal(progress[0]?.status, "completed");
  assert.equal(progress[0]?.revision, 1);
});

test("isolates progress for two enrollments studying the same curriculum", async () => {
  const firstEnrollment = await createEnrollment();
  const secondEnrollment = await createEnrollment();
  const repository = new PostgresStudyRepository(client.db);
  const session = await repository.ensureDailySession(
    sessionInput(firstEnrollment, randomUUID()),
  );
  const item = session.items[0];
  assert.ok(item);

  await repository.startSessionItem({
    enrollmentId: firstEnrollment,
    sessionId: session.id,
    itemId: item.id,
    lessonId: item.resourceId,
    contentSchemaVersion: item.schemaVersion,
    contentRevision: item.revision,
    now: new Date("2026-09-03T12:35:00.000Z"),
  });

  assert.equal(
    (await repository.listLessonProgress(firstEnrollment)).length,
    1,
  );
  assert.equal(
    (await repository.listLessonProgress(secondEnrollment)).length,
    0,
  );
});
