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
    maxAttempts: 3,
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
    enrollmentId,
    localStudyDate: "2026-09-03",
    plannerVersion: "daily-session-v1",
    items: [
      {
        id: `item-${suffix}`,
        kind: "lesson",
        resourceId: "lesson.a0.bootstrap.orientation",
        schemaVersion: 1,
        revision: 1,
        reasonCode: "NEW_ELIGIBLE_LESSON",
        eligibilityReason: "progress-satisfied",
        estimatedMinutes: 3,
      },
    ],
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

test("completes a planned review item in the same transaction as the review event", async () => {
  const enrollmentId = await createEnrollment();
  const practice = new PostgresPracticeRepository(client.db);
  const study = new PostgresStudyRepository(client.db);
  const attempted = await practice.submitAttempt(
    attemptInput(enrollmentId),
    reduceMastery,
  );
  assert.equal(attempted.ok, true);

  const [memory] = await practice.listDueReviewItems(
    enrollmentId,
    new Date("2026-09-03T13:00:00.000Z"),
    10,
  );
  assert.ok(memory);
  const suffix = randomUUID();
  const session = await study.ensureDailySession({
    sessionId: `session-review-${suffix}`,
    enrollmentId,
    localStudyDate: "2026-09-03",
    plannerVersion: "daily-session-v1",
    items: [
      {
        id: `item-review-${suffix}`,
        kind: "review",
        resourceId: memory.id,
        schemaVersion: 1,
        revision: 1,
        reasonCode: "OVERDUE_REVIEW",
        eligibilityReason: "not-applicable",
        estimatedMinutes: 2,
      },
    ],
    now: new Date("2026-09-03T13:01:00.000Z"),
  });
  const item = session.items[0];
  assert.ok(item);

  const result = await practice.recordReview(
    {
      reviewEventId: `review-planned-${suffix}`,
      enrollmentId,
      memoryItemId: memory.id,
      sessionItemId: item.id,
      operationKey: `review-planned-op-${suffix}`,
      expectedReviewCount: memory.reviewCount,
      grade: "good",
      correct: true,
      hintCount: 0,
      nextDueAt: new Date("2026-09-04T13:00:00.000Z"),
      intervalSeconds: 86_400,
      algorithmVersion: "review-scheduler-v1",
      modality: "reading",
      supportLevel: 0,
      now: new Date("2026-09-03T13:05:00.000Z"),
    },
    reduceMastery,
  );
  assert.equal(result.ok, true);

  const persisted = await study.findSession(enrollmentId, session.id);
  assert.equal(persisted?.status, "completed");
  assert.equal(persisted?.items[0]?.status, "completed");
  const eventCount = await client.pool.query(
    "select count(*)::int as count from review_events where enrollment_id = $1 and id = $2",
    [enrollmentId, `review-planned-${suffix}`],
  );
  assert.equal(eventCount.rows[0]?.count, 1);
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

test("enforces configured retry limit before creating additional evidence", async () => {
  const enrollmentId = await createEnrollment();
  const repository = new PostgresPracticeRepository(client.db);
  const activityId = `activity.retry-limit-${randomUUID()}`;
  const conceptId = `concept.retry-limit-${randomUUID()}`;

  for (let index = 0; index < 3; index += 1) {
    const result = await repository.submitAttempt(
      attemptInput(enrollmentId, {
        activityId,
        conceptIds: [conceptId],
        initialMemorySchedules: [
          {
            conceptId,
            memoryItemId: `memory-${randomUUID()}`,
            dueAt: new Date("2026-09-03T13:00:00.000Z"),
            intervalSeconds: 600,
            algorithmVersion: "review-scheduler-v1",
          },
        ],
      }),
      reduceMastery,
    );
    assert.equal(result.ok, true);
  }

  const rejected = await repository.submitAttempt(
    attemptInput(enrollmentId, {
      activityId,
      conceptIds: [conceptId],
      initialMemorySchedules: [
        {
          conceptId,
          memoryItemId: `memory-${randomUUID()}`,
          dueAt: new Date("2026-09-03T13:00:00.000Z"),
          intervalSeconds: 600,
          algorithmVersion: "review-scheduler-v1",
        },
      ],
    }),
    reduceMastery,
  );

  assert.deepEqual(rejected, { ok: false, reason: "retry-limit" });
  const state = await client.pool.query(
    `select
      (select count(*)::int from activity_attempts where enrollment_id = $1 and activity_id = $2) as attempts,
      (select count(*)::int from concept_evidence where enrollment_id = $1 and concept_id = $3) as evidence`,
    [enrollmentId, activityId, conceptId],
  );
  assert.deepEqual(state.rows[0], { attempts: 3, evidence: 3 });
});

test("paginates the due queue in deterministic dueAt/id order", async () => {
  const enrollmentId = await createEnrollment();
  const repository = new PostgresPracticeRepository(client.db);
  const dueAt = new Date("2026-09-03T13:00:00.000Z");

  for (const suffix of ["a", "b"]) {
    const conceptId = `concept.page.${suffix}.${randomUUID()}`;
    await repository.submitAttempt(
      attemptInput(enrollmentId, {
        activityId: `activity.page.${suffix}.${randomUUID()}`,
        conceptIds: [conceptId],
        initialMemorySchedules: [
          {
            conceptId,
            memoryItemId: `memory.page.${suffix}.${randomUUID()}`,
            dueAt,
            intervalSeconds: 600,
            algorithmVersion: "review-scheduler-v1",
          },
        ],
      }),
      reduceMastery,
    );
  }

  const first = await repository.listDueReviewItems(enrollmentId, dueAt, 1, 0);
  const second = await repository.listDueReviewItems(enrollmentId, dueAt, 1, 1);
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.notEqual(first[0]?.id, second[0]?.id);
  assert.ok((first[0]?.id ?? "") < (second[0]?.id ?? ""));
});
