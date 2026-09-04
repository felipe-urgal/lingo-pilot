import { describe, expect, it } from "vitest";
import {
  createCurriculumCatalog,
  type ContentDocument,
} from "../../../../packages/content/src/index.ts";
import type {
  LoadProgressSnapshotInput,
  ProgressRepository,
  ProgressSnapshot,
} from "../../../../packages/domain/src/index.ts";
import { createGetProgressOverview } from "./get-progress-overview.ts";

const now = new Date("2026-09-04T15:00:00.000Z");

function catalog() {
  const base = {
    schemaVersion: 1 as const,
    revision: 1,
    status: "published" as const,
  };
  const documents: readonly ContentDocument[] = [
    {
      ...base,
      kind: "course",
      id: "course.en.ptbr.v1",
      sourceLocale: "pt-BR",
      targetLocale: "en",
      title: { "pt-BR": "Inglês" },
      levelIds: ["level.a0", "level.a1"],
    },
    {
      ...base,
      kind: "level",
      id: "level.a0",
      courseId: "course.en.ptbr.v1",
      cefr: "A0",
      title: { "pt-BR": "Fundamentos" },
      unitIds: ["unit.a0.01"],
    },
    {
      ...base,
      kind: "level",
      id: "level.a1",
      courseId: "course.en.ptbr.v1",
      cefr: "A1",
      title: { "pt-BR": "Básico" },
      unitIds: ["unit.a1.01"],
    },
    {
      ...base,
      kind: "unit",
      id: "unit.a0.01",
      levelId: "level.a0",
      title: { "pt-BR": "Primeiros passos" },
      lessonIds: ["lesson.a0.01"],
    },
    {
      ...base,
      kind: "unit",
      id: "unit.a1.01",
      levelId: "level.a1",
      title: { "pt-BR": "Rotina" },
      lessonIds: ["lesson.a1.01"],
    },
    {
      ...base,
      kind: "lesson",
      id: "lesson.a0.01",
      levelId: "level.a0",
      unitId: "unit.a0.01",
      title: { "pt-BR": "Começar" },
      estimatedMinutes: 5,
      objectives: [{ id: "o.a0", description: { "pt-BR": "Começar" } }],
      prerequisiteLessonIds: [],
      introducesConceptIds: [],
      reinforcesConceptIds: [],
      vocabularyIds: [],
      blocks: [{ id: "b.a0", type: "example", text: { "pt-BR": "Hi" } }],
      activityIds: [],
    },
    {
      ...base,
      kind: "lesson",
      id: "lesson.a1.01",
      levelId: "level.a1",
      unitId: "unit.a1.01",
      title: { "pt-BR": "Minha rotina" },
      estimatedMinutes: 6,
      objectives: [{ id: "o.a1", description: { "pt-BR": "Rotina" } }],
      prerequisiteLessonIds: ["lesson.a0.01"],
      introducesConceptIds: ["concept.present"],
      reinforcesConceptIds: [],
      vocabularyIds: [],
      blocks: [{ id: "b.a1", type: "example", text: { "pt-BR": "I work" } }],
      activityIds: [],
    },
    {
      ...base,
      kind: "concept",
      id: "concept.present",
      courseId: "course.en.ptbr.v1",
      title: { "pt-BR": "Presente simples" },
      description: { "pt-BR": "Rotina e fatos" },
      prerequisiteConceptIds: [],
    },
  ];
  return createCurriculumCatalog(documents, "course.en.ptbr.v1");
}

function journey(entryPointLevel: "A0" | "A1" = "A1") {
  return {
    learnerProfile: {
      userId: "user-1",
      interfaceLocale: "pt-BR" as const,
      timezone: "America/Sao_Paulo",
      dailyGoalMinutes: 20,
      primaryGoal: "conversation" as const,
      createdAt: now,
      updatedAt: now,
    },
    languageProfile: {
      id: "language-1",
      userId: "user-1",
      sourceLanguage: "pt-BR" as const,
      targetLanguage: "en" as const,
      startingLevel: entryPointLevel,
      currentEstimatedLevel: null,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    },
    enrollment: {
      id: "enrollment-1",
      languageProfileId: "language-1",
      courseId: "course.en.ptbr.v1",
      entryPointLevel,
      placementSource:
        entryPointLevel === "A0" ? ("zero" as const) : ("manual" as const),
      status: "active" as const,
      enrolledAt: now,
      updatedAt: now,
    },
  };
}

class ProgressRepositoryFake implements ProgressRepository {
  lastInput: LoadProgressSnapshotInput | null = null;

  constructor(private readonly snapshot: ProgressSnapshot) {}

  async loadProgressSnapshot(input: LoadProgressSnapshotInput) {
    this.lastInput = input;
    return this.snapshot;
  }
}

function emptySnapshot(): ProgressSnapshot {
  return {
    lessonProgress: [],
    mastery: {
      conceptCount: 0,
      averageScorePercent: null,
      averageConfidencePercent: null,
    },
    modalityEvidence: [],
    weakConcepts: [],
    dueReviewCount: 0,
    recentSessions: [],
    hasMoreSessions: false,
  };
}

describe("progress overview", () => {
  it("keeps manual placement separate from lesson completion and mastery", async () => {
    const progress = new ProgressRepositoryFake(emptySnapshot());
    const getOverview = createGetProgressOverview({
      clock: { now: () => now },
      catalog: catalog(),
      progress,
    });

    const result = await getOverview(journey("A1"));

    expect(result.location.level?.cefr).toBe("A1");
    expect(result.location.unit?.id).toBe("unit.a1.01");
    expect(result.location.lesson?.id).toBe("lesson.a1.01");
    expect(result.learning.completedLessons).toBe(0);
    expect(result.learning.masteryConceptCount).toBe(0);
    expect(result.learning.averageMasteryPercent).toBeNull();
    expect(result.modalities).toEqual([]);
    expect(result.curriculum).toEqual([
      expect.objectContaining({
        id: "level.a0",
        completedLessons: 0,
        units: [
          expect.objectContaining({
            lessons: [
              expect.objectContaining({
                id: "lesson.a0.01",
                status: "waived",
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        id: "level.a1",
        completedLessons: 0,
        units: [
          expect.objectContaining({
            lessons: [
              expect.objectContaining({
                id: "lesson.a1.01",
                status: "available",
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("uses persisted mastery, modality evidence and bounded history pagination", async () => {
    const progress = new ProgressRepositoryFake({
      ...emptySnapshot(),
      lessonProgress: [
        {
          enrollmentId: "enrollment-1",
          lessonId: "lesson.a1.01",
          schemaVersion: 1,
          revision: 1,
          status: "completed",
          currentBlockIndex: 0,
          startedAt: now,
          completedAt: now,
          updatedAt: now,
        },
      ],
      mastery: {
        conceptCount: 1,
        averageScorePercent: 42,
        averageConfidencePercent: 80,
      },
      modalityEvidence: [
        { modality: "reading", evidenceCount: 3, correctCount: 2 },
        { modality: "listening", evidenceCount: 2, correctCount: 2 },
        { modality: "mixed", evidenceCount: 5, correctCount: 5 },
      ],
      weakConcepts: [
        {
          enrollmentId: "enrollment-1",
          conceptId: "concept.present",
          scorePercent: 42,
          confidencePercent: 80,
          algorithmVersion: "mastery-v1",
          updatedAt: now,
        },
      ],
      dueReviewCount: 3,
      hasMoreSessions: true,
    });
    const getOverview = createGetProgressOverview({
      clock: { now: () => now },
      catalog: catalog(),
      progress,
    });

    const result = await getOverview(journey("A1"), {
      historyPage: 2,
      historyPageSize: 5,
    });

    expect(result.learning.completedLessons).toBe(1);
    expect(result.learning.averageMasteryPercent).toBe(42);
    expect(result.modalities).toEqual([
      { modality: "reading", evidenceCount: 3, correctPercent: 67 },
      { modality: "listening", evidenceCount: 2, correctPercent: 100 },
    ]);
    expect(result.curriculum[0]?.units[0]?.lessons[0]?.status).toBe("waived");
    expect(result.curriculum[1]?.units[0]?.lessons[0]?.status).toBe(
      "completed",
    );
    expect(result.weakConcepts).toEqual([
      {
        id: "concept.present",
        title: "Presente simples",
        scorePercent: 42,
        confidencePercent: 80,
      },
    ]);
    expect(result.dueReviewCount).toBe(3);
    expect(result.history.hasPrevious).toBe(true);
    expect(result.history.hasMore).toBe(true);
    expect(progress.lastInput).toMatchObject({
      enrollmentId: "enrollment-1",
      historyLimit: 5,
      historyOffset: 5,
      weakConceptLimit: 5,
    });
  });
});
