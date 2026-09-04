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
import { PostgresProgressRepository } from "../src/repositories/postgres-progress-repository.ts";
import { PostgresStudyRepository } from "../src/repositories/postgres-study-repository.ts";

const testDatabaseConfig = parseTestDatabaseEnvironment(process.env);
const client = createDatabaseClient(testDatabaseConfig.url, {
  applicationName: "lingo-pilot-progress-overview-test",
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

async function createEnrollment(prefix) {
  const suffix = randomUUID();
  const userId = `${prefix}-${suffix}`;
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
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  return journey.enrollment.id;
}

function sessionInput(enrollmentId, localStudyDate) {
  const suffix = randomUUID();
  return {
    sessionId: `session-${suffix}`,
    enrollmentId,
    localStudyDate,
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
    now: new Date(`${localStudyDate}T15:00:00.000Z`),
  };
}

function masteryProjection() {
  return {
    scorePercent: 40,
    confidencePercent: 80,
    algorithmVersion: "mastery-test-v1",
  };
}

async function submitEvidence(practice, enrollmentId, modality, correct) {
  const attemptSuffix = randomUUID();
  return practice.submitAttempt(
    {
      attemptId: `attempt-${attemptSuffix}`,
      enrollmentId,
      sessionItemId: null,
      activityId: "activity.a0.orientation.check",
      contentSchemaVersion: 1,
      contentRevision: 1,
      operationKey: `operation-${attemptSuffix}`,
      maxAttempts: 3,
      answer: "understood",
      correct,
      scorePercent: correct ? 100 : 0,
      hintCount: 0,
      modality,
      supportLevel: 0,
      evidenceKind: "independent-retrieval",
      conceptIds: ["concept.a0.lesson-flow"],
      initialMemorySchedules: [
        {
          conceptId: "concept.a0.lesson-flow",
          memoryItemId: `memory-${attemptSuffix}`,
          dueAt: new Date("2026-09-04T14:00:00.000Z"),
          intervalSeconds: 600,
          algorithmVersion: "review-scheduler-v1",
        },
      ],
      now: new Date("2026-09-04T15:15:00.000Z"),
    },
    masteryProjection,
  );
}

test("loads bounded ownership-scoped progress history and modality evidence", async () => {
  const enrollmentId = await createEnrollment("progress-owner");
  const otherEnrollmentId = await createEnrollment("progress-other");
  const study = new PostgresStudyRepository(client.db);
  const practice = new PostgresPracticeRepository(client.db);
  const progress = new PostgresProgressRepository(client.db);

  for (const date of ["2026-09-02", "2026-09-03", "2026-09-04"]) {
    await study.ensureDailySession(sessionInput(enrollmentId, date));
  }
  await study.ensureDailySession(sessionInput(otherEnrollmentId, "2026-09-05"));

  const activeSession = await study.findDailySession(
    enrollmentId,
    "2026-09-04",
  );
  assert.ok(activeSession?.items[0]);
  await study.startSessionItem({
    enrollmentId,
    sessionId: activeSession.id,
    itemId: activeSession.items[0].id,
    lessonId: activeSession.items[0].resourceId,
    contentSchemaVersion: activeSession.items[0].schemaVersion,
    contentRevision: activeSession.items[0].revision,
    now: new Date("2026-09-04T15:10:00.000Z"),
  });

  assert.equal(
    (await submitEvidence(practice, enrollmentId, "reading", false)).ok,
    true,
  );
  assert.equal(
    (await submitEvidence(practice, otherEnrollmentId, "speaking", true)).ok,
    true,
  );

  const firstPage = await progress.loadProgressSnapshot({
    enrollmentId,
    now: new Date("2026-09-04T16:00:00.000Z"),
    historyLimit: 2,
    historyOffset: 0,
    weakConceptLimit: 5,
  });

  assert.deepEqual(
    firstPage.recentSessions.map((session) => session.localStudyDate),
    ["2026-09-04", "2026-09-03"],
  );
  assert.equal(firstPage.hasMoreSessions, true);
  assert.equal(firstPage.recentSessions[0]?.items.length, 1);
  assert.equal(firstPage.lessonProgress.length, 1);
  assert.equal(firstPage.dueReviewCount, 1);
  assert.deepEqual(firstPage.mastery, {
    conceptCount: 1,
    averageScorePercent: 40,
    averageConfidencePercent: 80,
  });
  assert.deepEqual(firstPage.modalityEvidence, [
    { modality: "reading", evidenceCount: 1, correctCount: 0 },
  ]);
  assert.equal(firstPage.weakConcepts[0]?.conceptId, "concept.a0.lesson-flow");

  const secondPage = await progress.loadProgressSnapshot({
    enrollmentId,
    now: new Date("2026-09-04T16:00:00.000Z"),
    historyLimit: 2,
    historyOffset: 2,
  });
  assert.deepEqual(
    secondPage.recentSessions.map((session) => session.localStudyDate),
    ["2026-09-02"],
  );
  assert.equal(secondPage.hasMoreSessions, false);
  assert.equal(
    secondPage.recentSessions.some(
      (session) => session.enrollmentId === otherEnrollmentId,
    ),
    false,
  );
});
