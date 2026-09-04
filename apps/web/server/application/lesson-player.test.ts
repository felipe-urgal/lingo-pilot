import { describe, expect, it } from "vitest";
import {
  createCurriculumCatalog,
  type ContentDocument,
} from "../../../../packages/content/src/index.ts";
import type {
  LessonProgress,
  SaveLessonPositionInput,
  SessionExecutionRepository,
  SessionItem,
  StudyMutationResult,
  StudyRepository,
  StudySession,
} from "../../../../packages/domain/src/index.ts";
import { createGetLessonPlayer } from "./get-lesson-player.ts";
import { createNavigateLessonPlayer } from "./navigate-lesson-player.ts";

const now = new Date("2026-09-03T15:00:00.000Z");

function catalogWithRevision(revision: number) {
  const base = {
    schemaVersion: 1 as const,
    revision,
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
      levelIds: ["level.a0"],
    },
    {
      ...base,
      kind: "level",
      id: "level.a0",
      courseId: "course.en.ptbr.v1",
      cefr: "A0",
      title: { "pt-BR": "A0" },
      unitIds: ["unit.a0.01"],
    },
    {
      ...base,
      kind: "unit",
      id: "unit.a0.01",
      levelId: "level.a0",
      title: { "pt-BR": "Unidade" },
      lessonIds: ["lesson.a0.01"],
    },
    {
      ...base,
      kind: "lesson",
      id: "lesson.a0.01",
      levelId: "level.a0",
      unitId: "unit.a0.01",
      title: { "pt-BR": "Aula" },
      estimatedMinutes: 5,
      objectives: [
        {
          id: "objective.a0.01",
          description: { "pt-BR": "Avançar com segurança" },
        },
      ],
      prerequisiteLessonIds: [],
      introducesConceptIds: [],
      reinforcesConceptIds: [],
      vocabularyIds: [],
      blocks: [
        {
          id: "block.a0.01.1",
          type: "explanation",
          text: { "pt-BR": "Primeiro" },
        },
        {
          id: "block.a0.01.2",
          type: "checkpoint",
          text: { "pt-BR": "Segundo" },
        },
      ],
      activityIds: [],
    },
  ];
  return createCurriculumCatalog(documents, "course.en.ptbr.v1");
}

const journey = {
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
    startingLevel: "A0" as const,
    currentEstimatedLevel: null,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  },
  enrollment: {
    id: "enrollment-1",
    languageProfileId: "language-1",
    courseId: "course.en.ptbr.v1",
    entryPointLevel: "A0" as const,
    placementSource: "zero" as const,
    status: "active" as const,
    enrolledAt: now,
    updatedAt: now,
  },
};

class StudyRepositoryFake implements StudyRepository {
  progress: LessonProgress = {
    enrollmentId: "enrollment-1",
    lessonId: "lesson.a0.01",
    schemaVersion: 1,
    revision: 1,
    status: "in_progress",
    currentBlockIndex: 0,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };

  session: StudySession = {
    id: "session-1",
    enrollmentId: "enrollment-1",
    localStudyDate: "2026-09-03",
    plannerVersion: "today-shell-v1",
    status: "in_progress",
    createdAt: now,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    items: [
      {
        id: "item-1",
        studySessionId: "session-1",
        position: 0,
        kind: "lesson",
        resourceId: "lesson.a0.01",
        schemaVersion: 1,
        revision: 1,
        reasonCode: "NEW_ELIGIBLE_LESSON",
        eligibilityReason: "progress-satisfied",
        estimatedMinutes: 5,
        status: "in_progress",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  async listLessonProgress() {
    return [this.progress];
  }

  async findDailySession() {
    return this.session;
  }

  async findSession(_enrollmentId: string, sessionId: string) {
    return sessionId === this.session.id ? this.session : null;
  }

  async ensureDailySession() {
    return this.session;
  }

  async startSessionItem(): Promise<StudyMutationResult<LessonProgress>> {
    return { ok: true, value: this.progress };
  }

  async saveLessonPosition(
    input: SaveLessonPositionInput,
  ): Promise<StudyMutationResult<LessonProgress>> {
    if (input.expectedBlockIndex !== this.progress.currentBlockIndex) {
      return { ok: false, reason: "invalid-state" };
    }
    this.progress = {
      ...this.progress,
      currentBlockIndex: input.currentBlockIndex,
      updatedAt: input.now,
    };
    return { ok: true, value: this.progress };
  }

  async completeLesson(): Promise<StudyMutationResult<StudySession>> {
    this.progress = {
      ...this.progress,
      status: "completed",
      completedAt: now,
      updatedAt: now,
    };
    this.session = {
      ...this.session,
      status: "completed",
      completedAt: now,
      updatedAt: now,
      items: this.session.items.map((item) => ({
        ...item,
        status: "completed" as const,
      })),
    };
    return { ok: true, value: this.session };
  }

  async findSessionItem(
    _enrollmentId: string,
    itemId: string,
  ): Promise<SessionItem | null> {
    return this.session.items.find((item) => item.id === itemId) ?? null;
  }
}

class SessionExecutionRepositoryFake implements SessionExecutionRepository {
  constructor(private readonly study: StudyRepositoryFake) {}

  async findLatestOpenSession() {
    return this.study.session.status === "completed" ? null : this.study.session;
  }

  async findReviewResource() {
    return null;
  }

  async skipSessionItem() {
    return { ok: false as const, reason: "invalid-state" as const };
  }

  async finalizeSessionIfTerminal() {
    return this.study.session;
  }

  async finalizeSessionContainingItem() {
    return this.study.session;
  }
}

function navigationDependencies(study: StudyRepositoryFake) {
  return {
    clock: { now: () => now },
    catalog: catalogWithRevision(1),
    study,
    execution: new SessionExecutionRepositoryFake(study),
  };
}

describe("lesson player application flow", () => {
  it("stops resume when the authored revision no longer matches persisted progress", async () => {
    const study = new StudyRepositoryFake();
    const getPlayer = createGetLessonPlayer({
      catalog: catalogWithRevision(2),
      study,
    });

    await expect(
      getPlayer({
        journey,
        sessionId: "session-1",
        itemId: "item-1",
        lessonId: "lesson.a0.01",
      }),
    ).resolves.toEqual({ ok: false, reason: "revision-conflict" });
  });

  it("persists resume position and completes only after an explicit final action", async () => {
    const study = new StudyRepositoryFake();
    const dependencies = navigationDependencies(study);
    const navigate = createNavigateLessonPlayer(dependencies);
    const getPlayer = createGetLessonPlayer(dependencies);

    const next = await navigate({
      journey,
      sessionId: "session-1",
      itemId: "item-1",
      lessonId: "lesson.a0.01",
      action: "next",
      expectedBlockIndex: 0,
    });
    expect(next).toEqual({ ok: true, completed: false, currentBlockIndex: 1 });

    const resumed = await getPlayer({
      journey,
      sessionId: "session-1",
      itemId: "item-1",
      lessonId: "lesson.a0.01",
    });
    expect(resumed.ok && resumed.progress.currentBlockIndex).toBe(1);
    expect(study.session.status).toBe("in_progress");

    const completed = await navigate({
      journey,
      sessionId: "session-1",
      itemId: "item-1",
      lessonId: "lesson.a0.01",
      action: "complete",
      expectedBlockIndex: 1,
    });
    expect(completed).toEqual({
      ok: true,
      completed: true,
      currentBlockIndex: 1,
    });
    expect(study.session.status).toBe("completed");
  });

  it("treats a stale duplicate navigation submit as invalid state", async () => {
    const study = new StudyRepositoryFake();
    const navigate = createNavigateLessonPlayer(navigationDependencies(study));

    await navigate({
      journey,
      sessionId: "session-1",
      itemId: "item-1",
      lessonId: "lesson.a0.01",
      action: "next",
      expectedBlockIndex: 0,
    });
    const duplicate = await navigate({
      journey,
      sessionId: "session-1",
      itemId: "item-1",
      lessonId: "lesson.a0.01",
      action: "next",
      expectedBlockIndex: 0,
    });

    expect(duplicate).toEqual({ ok: false, reason: "invalid-state" });
    expect(study.progress.currentBlockIndex).toBe(1);
  });
});