import { readdir, readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { Activity, Lesson, Unit } from "./model.ts";
import type { ContentInput } from "./validator.ts";
import { validateContentInputs } from "./validator.ts";

const contentRoot = fileURLToPath(
  new URL("../../../content/courses/pt-BR_en/", import.meta.url),
);

async function collectContentInputs(directory: string): Promise<ContentInput[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const inputs: ContentInput[] = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      inputs.push(...(await collectContentInputs(path)));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    inputs.push({
      file: relative(contentRoot, path).replaceAll("\\", "/"),
      value: JSON.parse(await readFile(path, "utf8")) as unknown,
    });
  }

  return inputs;
}

function lessonById(
  lessons: readonly Lesson[],
  id: string,
): Lesson {
  const lesson = lessons.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Review lesson not loaded: ${id}`);
  return lesson;
}

describe("A0 editorial review content", () => {
  let inputs: readonly ContentInput[] = [];

  beforeAll(async () => {
    inputs = await collectContentInputs(contentRoot);
  });

  it("validates Units 01 and 02 against the real course graph without publishing them", () => {
    const result = validateContentInputs(inputs);

    expect(result.issues).toEqual([]);
    const a0 = result.documents.find(
      (loaded) => loaded.document.id === "level.a0",
    )?.document;
    expect(a0?.kind).toBe("level");
    if (a0?.kind !== "level") throw new Error("A0 level not loaded");

    expect(a0.unitIds).not.toContain("unit.a0.01.first-contact");
    expect(a0.unitIds).not.toContain("unit.a0.02.personal-information");

    const reviewDocuments = result.documents.filter(
      (loaded) => loaded.document.status === "review",
    );
    expect(reviewDocuments).toHaveLength(48);
  });

  it("links every review lesson objective to at least one deterministic activity", () => {
    const result = validateContentInputs(inputs);
    const documents = result.documents.map((loaded) => loaded.document);
    const activities = documents.filter(
      (document): document is Activity =>
        document.kind === "activity" && document.status === "review",
    );
    const lessons = documents.filter(
      (document): document is Lesson =>
        document.kind === "lesson" && document.status === "review",
    );

    expect(lessons).toHaveLength(12);
    expect(activities).toHaveLength(12);
    for (const lesson of lessons) {
      const coveredObjectives = new Set(
        activities
          .filter((activity) => activity.lessonId === lesson.id)
          .flatMap((activity) => activity.objectiveIds),
      );
      expect(
        lesson.objectives.every((objective) =>
          coveredObjectives.has(objective.id),
        ),
      ).toBe(true);
    }
  });

  it("keeps Unit 02 ordered with an explicit bridge from Unit 01", () => {
    const result = validateContentInputs(inputs);
    const documents = result.documents.map((loaded) => loaded.document);
    const unit02 = documents.find(
      (document): document is Unit =>
        document.kind === "unit" &&
        document.id === "unit.a0.02.personal-information",
    );
    if (!unit02) throw new Error("A0 review Unit 02 not loaded");

    expect(unit02.lessonIds).toEqual([
      "lesson.a0.007.be-negative",
      "lesson.a0.008.be-questions",
      "lesson.a0.009.be-short-answers",
      "lesson.a0.010.numbers-0-20",
      "lesson.a0.011.numbers-20-100",
      "lesson.a0.012.age-and-phone",
    ]);

    const lessons = documents.filter(
      (document): document is Lesson => document.kind === "lesson",
    );
    const expectedPrerequisites = [
      ["lesson.a0.007.be-negative", "lesson.a0.006.be-contractions"],
      ["lesson.a0.008.be-questions", "lesson.a0.007.be-negative"],
      ["lesson.a0.009.be-short-answers", "lesson.a0.008.be-questions"],
      ["lesson.a0.010.numbers-0-20", "lesson.a0.009.be-short-answers"],
      ["lesson.a0.011.numbers-20-100", "lesson.a0.010.numbers-0-20"],
      ["lesson.a0.012.age-and-phone", "lesson.a0.011.numbers-20-100"],
    ] as const;

    for (const [lessonId, prerequisiteId] of expectedPrerequisites) {
      expect(lessonById(lessons, lessonId).prerequisiteLessonIds).toEqual([
        prerequisiteId,
      ]);
    }
  });
});
