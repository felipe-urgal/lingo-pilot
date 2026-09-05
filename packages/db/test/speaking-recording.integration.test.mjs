import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import {
  createDatabaseClient,
  createUser,
  migrateDatabase,
  PostgresSpeakingRepository,
} from "../src/index.ts";
import { PostgresLearnerJourneyRepository } from "../src/repositories/postgres-learner-journey-repository.ts";
import { PostgresStudyRepository } from "../src/repositories/postgres-study-repository.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-speaking-recording-test",
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

async function createJourney() {
  const suffix = randomUUID();
  const userId = `speaking-${suffix}`;
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
    now: new Date("2026-09-05T12:00:00.000Z"),
  });
  return { userId, enrollmentId: journey.enrollment.id };
}

async function createLessonSession(enrollmentId) {
  const suffix = randomUUID();
  const itemId = `speaking-item-${suffix}`;
  const lessonId = "lesson.a0.bootstrap.orientation";
  const study = new PostgresStudyRepository(client.db);
  await study.ensureDailySession({
    sessionId: `speaking-session-${suffix}`,
    enrollmentId,
    localStudyDate: "2026-09-05",
    plannerVersion: "daily-session-v1",
    items: [
      {
        id: itemId,
        kind: "lesson",
        resourceId: lessonId,
        schemaVersion: 1,
        revision: 1,
        reasonCode: "NEW_ELIGIBLE_LESSON",
        eligibilityReason: "progress-satisfied",
        estimatedMinutes: 3,
      },
    ],
    now: new Date("2026-09-05T12:05:00.000Z"),
  });
  return { itemId, lessonId };
}

function reservation(enrollmentId, sessionItemId, operationKey, suffix) {
  const now = new Date("2026-09-05T12:10:00.000Z");
  return {
    id: `attempt-${suffix}`,
    enrollmentId,
    sessionItemId,
    activityId: "activity.a0.speaking.fixture",
    contentSchemaVersion: 1,
    contentRevision: 1,
    operationKey,
    assetId: `asset-${suffix}`,
    objectKey: `speaking/user/attempt-${suffix}/asset-${suffix}`,
    mimeType: "audio/webm",
    byteLength: 1024,
    durationMs: 2_000,
    uploadExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    now,
  };
}

test("verifies lesson ownership through the authenticated user", async () => {
  const owner = await createJourney();
  const other = await createJourney();
  const { itemId, lessonId } = await createLessonSession(owner.enrollmentId);
  const repository = new PostgresSpeakingRepository(client.db);

  assert.equal(
    await repository.ownsLessonSessionItem({
      userId: owner.userId,
      enrollmentId: owner.enrollmentId,
      sessionItemId: itemId,
      lessonId,
    }),
    true,
  );
  assert.equal(
    await repository.ownsLessonSessionItem({
      userId: other.userId,
      enrollmentId: owner.enrollmentId,
      sessionItemId: itemId,
      lessonId,
    }),
    false,
  );
});

test("atomically reserves one attempt per enrollment operation key", async () => {
  const owner = await createJourney();
  const { itemId } = await createLessonSession(owner.enrollmentId);
  const repository = new PostgresSpeakingRepository(client.db);
  const operationKey = `op-${randomUUID()}`;

  const [first, second] = await Promise.all([
    repository.reserveAttempt(
      reservation(owner.enrollmentId, itemId, operationKey, randomUUID()),
    ),
    repository.reserveAttempt(
      reservation(owner.enrollmentId, itemId, operationKey, randomUUID()),
    ),
  ]);

  assert.equal(Number(first.inserted) + Number(second.inserted), 1);
  assert.equal(first.attempt.id, second.attempt.id);

  const count = await client.pool.query(
    "select count(*)::int as count from speaking_attempts where enrollment_id = $1 and operation_key = $2",
    [owner.enrollmentId, operationKey],
  );
  assert.equal(count.rows[0]?.count, 1);
});

test("persists upload retention and exposes expired/discarded cleanup candidates", async () => {
  const owner = await createJourney();
  const { itemId } = await createLessonSession(owner.enrollmentId);
  const repository = new PostgresSpeakingRepository(client.db);
  const suffix = randomUUID();
  const reserved = await repository.reserveAttempt(
    reservation(owner.enrollmentId, itemId, `op-${suffix}`, suffix),
  );

  assert.equal(
    (await repository.findOwnedAttempt(owner.userId, reserved.attempt.id))?.status,
    "reserved",
  );
  assert.equal(
    await repository.findOwnedAttempt(`other-${randomUUID()}`, reserved.attempt.id),
    null,
  );

  const uploadedAt = new Date("2026-09-05T12:12:00.000Z");
  const retainedUntil = new Date(uploadedAt.getTime() + 24 * 60 * 60 * 1000);
  const uploaded = await repository.markUploaded({
    attemptId: reserved.attempt.id,
    etag: "etag-fixture",
    uploadedAt,
    retainedUntil,
    now: uploadedAt,
  });
  assert.equal(uploaded?.status, "uploaded");
  assert.equal(uploaded?.retainedUntil?.toISOString(), retainedUntil.toISOString());

  assert.equal(
    (await repository.listCleanupCandidates(new Date(retainedUntil.getTime() - 1), 10))
      .some((item) => item.id === reserved.attempt.id),
    false,
  );
  assert.equal(
    (await repository.listCleanupCandidates(retainedUntil, 10)).some(
      (item) => item.id === reserved.attempt.id,
    ),
    true,
  );

  const discarded = await repository.discardOwnedAttempt(
    owner.userId,
    reserved.attempt.id,
    new Date("2026-09-05T13:00:00.000Z"),
  );
  assert.equal(discarded?.status, "discarded");
  assert.equal(
    (await repository.listCleanupCandidates(new Date("2026-09-05T13:00:01.000Z"), 10))
      .some((item) => item.id === reserved.attempt.id),
    true,
  );

  const deleted = await repository.markDeleted(
    reserved.attempt.id,
    new Date("2026-09-05T13:01:00.000Z"),
  );
  assert.equal(deleted?.status, "deleted");
  assert.equal(
    (await repository.listCleanupCandidates(new Date("2026-09-07T00:00:00.000Z"), 10))
      .some((item) => item.id === reserved.attempt.id),
    false,
  );
});
