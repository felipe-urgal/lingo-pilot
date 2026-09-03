import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { parseTestDatabaseEnvironment } from "@lingo-pilot/config/runtime/environment";
import {
  createDatabaseClient,
  createUser,
  migrateDatabase,
  PostgresPracticeRepository,
} from "../src/index.ts";
import { PostgresLearnerJourneyRepository } from "../src/repositories/postgres-learner-journey-repository.ts";
import { PostgresStudyRepository } from "../src/repositories/postgres-study-repository.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-practice-learning-test",
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
  const userId = `practice-${suffix}`;
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

function reduceMastery(evidence) {
  const correct = evidence.filter((item) => item.outcome === "correct").length;
  return {
    scorePercent: Math.min(100, 50 + correct * 10),
    confidencePercent: Math.min(100, evidence.length * 25),
    algorithmVersion: "mastery-test-v1",
  };
}

function attemptInput(enrollmentId, overrides = {}) {
  const suffix = randomUUID();
  const now = new Date("2026-09-03T13:00:00.000Z");
  return {
    attemptId: `attempt-${suffix}`,
    enrollmentId,
    sessionItemId: null,
    activityId: "activity.a0.orientation.check",
    contentSchemaVersion: 1,
    contentRevision: 1,
    operationKey: `attempt-op-${suffix}`,
    answer: "understood",
    correct: true,
    scorePercent: 100,
    hintCount: 0,
    modality: "reading",
    supportLevel: 1,
    evidenceKind: "guided",
    conceptIds: ["concept.a0.lesson-flow"],
    initialMemorySchedules: [
      {
        conceptId: "concept.a0.lesson-flow",
        memoryItemId: `memory-${suffix}`,
        dueAt: now,
        intervalSeconds: 600,
        algorithmVersion: "review-scheduler-v1",
      },
    ],
    now,
    ...overrides,
  };
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

test("idempotently persists attempt, progress, review state, evidence and mastery", async () => {
  const enrollmentId = await createEnrollment();
  const repository = new PostgresPracticeRepository(client.db);
  const input = attemptInput(enrollmentId);

  const first = await repository.submitAttempt(input, reduceMastery);
  const retry = await repository.submitAttempt(input, reduceMastery);

  assert.equal(first.ok, true);
  assert.equal(retry.ok, true);
  if (first.ok && retry.ok) {
    assert.equal(first.duplicate, false);
    assert.equal(retry.duplicate, true);
    assert.equal(first.attempt.id, retry.attempt.id);
  }

  const state = await client.pool.query(
    `select
      (select count(*)::int from activity_attempts where enrollment_id = $1) as attempts,
      (select attempts from activity_progress where enrollment_id = $1 and activity_id = $2) as progress_attempts,
      (select count(*)::int from concept_evidence where enrollment_id = $1) as evidence,
      (select count(*)::int from memory_items where enrollment_id = $1) as memory_items,
      (select count(*)::int from mastery_states where enrollment_id = $1) as mastery_states`,
    [enrollmentId, input.activityId],
  );
  assert.deepEqual(state.rows[0], {
    attempts: 1,
    progress_attempts: 1,
    evidence: 1,
    memory_items: 1,
    mastery_states: 1,
  });

  const due = await repository.listDueReviewItems(
    enrollmentId,
    new Date("2026-09-03T13:00:00.000Z"),
    10,
  );
  assert.equal(due.length, 1);
  assert.equal(due[0]?.conceptId, "concept.a0.lesson-flow");
  assert.equal(due[0]?.mastery?.confidencePercent, 25);

  const memory = due[0];
  assert.ok(memory);
  const reviewInput = {
    reviewEventId: `review-${randomUUID()}`,
    enrollmentId,
    memoryItemId: memory.id,
    operationKey: `review-op-${randomUUID()}`,
    expectedReviewCount: 0,
    grade: "good",
    correct: true,
    hintCount: 0,
    nextDueAt: new Date("2026-09-04T13:00:00.000Z"),
    intervalSeconds: 86_400,
    algorithmVersion: "review-scheduler-v1",
    modality: "reading",
    supportLevel: 0,
    now: new Date("2026-09-03T13:05:00.000Z"),
  };

  const review = await repository.recordReview(reviewInput, reduceMastery);
  const reviewRetry = await repository.recordReview(reviewInput, reduceMastery);
  assert.equal(review.ok, true);
  assert.equal(reviewRetry.ok, true);
  if (review.ok && reviewRetry.ok) {
    assert.equal(review.duplicate, false);
    assert.equal(reviewRetry.duplicate, true);
    assert.equal(review.event.id, reviewRetry.event.id);
  }

  const stale = await repository.recordReview(
    {
      ...reviewInput,
      reviewEventId: `review-${randomUUID()}`,
      operationKey: `review-op-${randomUUID()}`,
    },
    reduceMastery,
  );
  assert.deepEqual(stale, { ok: false, reason: "stale-review" });

  const afterReview = await client.pool.query(
    `select
      (select count(*)::int from review_events where enrollment_id = $1) as reviews,
      (select count(*)::int from concept_evidence where enrollment_id = $1) as evidence,
      (select review_count from memory_items where enrollment_id = $1) as review_count`,
    [enrollmentId],
  );
  assert.deepEqual(afterReview.rows[0], {
    reviews: 1,
    evidence: 2,
    review_count: 1,
  });
});

test("rolls back the whole attempt transaction when mastery projection fails", async () => {
  const enrollmentId = await createEnrollment();
  const repository = new PostgresPracticeRepository(client.db);
  const input = attemptInput(enrollmentId, {
    activityId: "activity.rollback",
    conceptIds: ["concept.rollback"],
    initialMemorySchedules: [
      {
        conceptId: "concept.rollback",
        memoryItemId: `memory-${randomUUID()}`,
        dueAt: new Date("2026-09-03T13:00:00.000Z"),
        intervalSeconds: 600,
        algorithmVersion: "review-scheduler-v1",
      },
    ],
  });

  await assert.rejects(
    () =>
      repository.submitAttempt(input, () => {
        throw new Error("projection failed");
      }),
    /projection failed/,
  );

  const counts = await client.pool.query(
    `select
      (select count(*)::int from activity_attempts where enrollment_id = $1 and operation_key = $2) as attempts,
      (select count(*)::int from activity_progress where enrollment_id = $1 and activity_id = $3) as progress,
      (select count(*)::int from concept_evidence where enrollment_id = $1 and concept_id = 'concept.rollback') as evidence,
      (select count(*)::int from memory_items where enrollment_id = $1 and concept_id = 'concept.rollback') as memory_items`,
    [enrollmentId, input.operationKey, input.activityId],
  );
  assert.deepEqual(counts.rows[0], {
    attempts: 0,
    progress: 0,
    evidence: 0,
    memory_items: 0,
  });
});

test("rejects a session item owned by another enrollment without leaking its existence", async () => {
  const firstEnrollment = await createEnrollment();
  const secondEnrollment = await createEnrollment();
  const study = new PostgresStudyRepository(client.db);
  const foreignSession = await study.ensureDailySession(
    sessionInput(secondEnrollment, randomUUID()),
  );
  const foreignItem = foreignSession.items[0];
  assert.ok(foreignItem);

  const repository = new PostgresPracticeRepository(client.db);
  const result = await repository.submitAttempt(
    attemptInput(firstEnrollment, { sessionItemId: foreignItem.id }),
    reduceMastery,
  );

  assert.deepEqual(result, { ok: false, reason: "not-found" });
  const counts = await client.pool.query(
    "select count(*)::int as attempts from activity_attempts where enrollment_id = $1",
    [firstEnrollment],
  );
  assert.equal(counts.rows[0]?.attempts, 0);
});
