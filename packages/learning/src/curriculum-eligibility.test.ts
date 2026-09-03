import { describe, expect, it } from "vitest";
import {
  createCurriculumCatalog,
  type ContentDocument,
} from "../../content/src/index.ts";
import {
  canStartLesson,
  evaluateCurriculum,
  nextEligibleLesson,
} from "./curriculum-eligibility.ts";

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
    levelIds: ["level.a0", "level.a1", "level.a2"],
  },
  ...(["A0", "A1", "A2"] as const).map((cefr) => ({
    ...base,
    kind: "level" as const,
    id: `level.${cefr.toLowerCase()}`,
    courseId: "course.en.ptbr.v1",
    cefr,
    title: { "pt-BR": cefr },
    unitIds: [`unit.${cefr.toLowerCase()}.01`],
  })),
  ...(["A0", "A1", "A2"] as const).map((cefr) => ({
    ...base,
    kind: "unit" as const,
    id: `unit.${cefr.toLowerCase()}.01`,
    levelId: `level.${cefr.toLowerCase()}`,
    title: { "pt-BR": cefr },
    lessonIds: [`lesson.${cefr.toLowerCase()}.01`],
  })),
  ...(["A0", "A1", "A2"] as const).map((cefr, index) => ({
    ...base,
    kind: "lesson" as const,
    id: `lesson.${cefr.toLowerCase()}.01`,
    levelId: `level.${cefr.toLowerCase()}`,
    unitId: `unit.${cefr.toLowerCase()}.01`,
    title: { "pt-BR": cefr },
    estimatedMinutes: 5,
    objectives: [
      {
        id: `objective.${cefr.toLowerCase()}.01`,
        description: { "pt-BR": "Objetivo" },
      },
    ],
    prerequisiteLessonIds: index === 0 ? [] : [`lesson.a${index - 1}.01`],
    introducesConceptIds: [],
    reinforcesConceptIds: [],
    vocabularyIds: [],
    blocks: [],
    activityIds: [],
  })),
];

const catalog = createCurriculumCatalog(documents, "course.en.ptbr.v1");

function evaluate(
  entryPointLevel: "A0" | "A1" | "A2",
  progress: Parameters<typeof evaluateCurriculum>[0]["progress"] = [],
) {
  return evaluateCurriculum({
    catalog,
    entryPointLevel,
    enrollmentStatus: "active",
    progress,
  });
}

describe("curriculum eligibility", () => {
  it("keeps the next lesson locked until real prerequisite progress exists", () => {
    const before = evaluate("A0");
    expect(before[0]).toMatchObject({
      availability: "available",
      reason: "progress-satisfied",
    });
    expect(before[1]).toMatchObject({
      availability: "locked",
      reason: "prerequisite-missing",
    });

    const after = evaluate("A0", [
      {
        lessonId: "lesson.a0.01",
        status: "completed",
        schemaVersion: 1,
        revision: 1,
      },
    ]);
    expect(after[1]).toMatchObject({
      availability: "available",
      reason: "progress-satisfied",
    });
  });

  it("waives earlier levels for placement without fabricating completion", () => {
    const eligibility = evaluate("A1");

    expect(eligibility[0]).toMatchObject({
      availability: "waived",
      reason: "placement-waived",
    });
    expect(eligibility[1]).toMatchObject({
      availability: "available",
      reason: "placement-waived",
    });
    expect(eligibility[0]?.availability).not.toBe("completed");
    expect(nextEligibleLesson(eligibility)?.lesson.id).toBe("lesson.a1.01");
  });

  it("starts an A2 placement at A2 while keeping earlier lessons waived", () => {
    const eligibility = evaluate("A2");

    expect(eligibility.map((item) => item.availability)).toEqual([
      "waived",
      "waived",
      "available",
    ]);
    expect(nextEligibleLesson(eligibility)?.lesson.id).toBe("lesson.a2.01");
  });

  it("does not allow a locked lesson to start by id", () => {
    expect(canStartLesson(evaluate("A0"), "lesson.a1.01")).toBe(false);
    expect(canStartLesson(evaluate("A0"), "lesson.a0.01")).toBe(true);
  });

  it("blocks an in-progress lesson when its content revision changed", () => {
    const eligibility = evaluate("A0", [
      {
        lessonId: "lesson.a0.01",
        status: "in_progress",
        schemaVersion: 1,
        revision: 0,
      },
    ]);

    expect(eligibility[0]).toMatchObject({
      availability: "locked",
      reason: "revision-mismatch",
    });
  });
});
