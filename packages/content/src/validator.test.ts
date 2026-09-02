import { describe, expect, it } from "vitest";
import type { ContentInput } from "./validator.ts";
import { validateContentInputs } from "./validator.ts";

const validInputs: readonly ContentInput[] = [
  {
    file: "course.json",
    value: {
      kind: "course",
      id: "course.en.ptbr.v1",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      sourceLocale: "pt-BR",
      targetLocale: "en",
      title: { "pt-BR": "Inglês essencial" },
      levelIds: ["level.a0"],
    },
  },
  {
    file: "level-a0.json",
    value: {
      kind: "level",
      id: "level.a0",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      courseId: "course.en.ptbr.v1",
      cefr: "A0",
      title: { "pt-BR": "Iniciante absoluto" },
      unitIds: ["unit.a0.01"],
    },
  },
  {
    file: "unit-a0-01.json",
    value: {
      kind: "unit",
      id: "unit.a0.01",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      levelId: "level.a0",
      title: { "pt-BR": "Primeiros contatos" },
      lessonIds: ["lesson.a0.01.greetings"],
    },
  },
  {
    file: "concept-greetings.json",
    value: {
      kind: "concept",
      id: "concept.greetings.basic",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      courseId: "course.en.ptbr.v1",
      title: { "pt-BR": "Cumprimentos básicos" },
      description: { "pt-BR": "Reconhecer cumprimentos simples." },
      prerequisiteConceptIds: [],
    },
  },
  {
    file: "vocab-hello.json",
    value: {
      kind: "vocabulary",
      id: "vocab.hello",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      courseId: "course.en.ptbr.v1",
      lemma: "hello",
      language: "en",
      partOfSpeech: "interjection",
      translations: { "pt-BR": "olá" },
      introducedInLessonId: "lesson.a0.01.greetings",
    },
  },
  {
    file: "lesson-greetings.json",
    value: {
      kind: "lesson",
      id: "lesson.a0.01.greetings",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      levelId: "level.a0",
      unitId: "unit.a0.01",
      title: { "pt-BR": "Cumprimentos" },
      estimatedMinutes: 8,
      objectives: [
        {
          id: "objective.a0.greetings.identify",
          description: { "pt-BR": "Identificar um cumprimento básico." },
        },
      ],
      prerequisiteLessonIds: [],
      introducesConceptIds: ["concept.greetings.basic"],
      reinforcesConceptIds: [],
      vocabularyIds: ["vocab.hello"],
      blocks: [
        {
          id: "block.a0.greetings.explanation",
          type: "explanation",
          text: { "pt-BR": "Hello é uma forma comum de dizer olá." },
        },
      ],
      activityIds: ["activity.a0.01.greetings.choice"],
    },
  },
  {
    file: "activity-greetings.json",
    value: {
      kind: "activity",
      id: "activity.a0.01.greetings.choice",
      schemaVersion: 1,
      revision: 1,
      status: "published",
      lessonId: "lesson.a0.01.greetings",
      type: "single-choice",
      prompt: { "pt-BR": "Qual opção significa olá?" },
      evaluation: {
        type: "deterministic",
        acceptedAnswers: ["hello"],
      },
      conceptIds: ["concept.greetings.basic"],
      objectiveIds: ["objective.a0.greetings.identify"],
      modality: "reading",
      supportLevel: 1,
      difficulty: 1,
    },
  },
];

function fixtureInputs(): ContentInput[] {
  return structuredClone(validInputs) as ContentInput[];
}

function fixtureValue(
  inputs: ContentInput[],
  file: string,
): Record<string, unknown> {
  const input = inputs.find((candidate) => candidate.file === file);
  if (!input || typeof input.value !== "object" || input.value === null) {
    throw new Error(`Fixture not found: ${file}`);
  }
  return input.value as Record<string, unknown>;
}

function rulesFor(inputs: readonly ContentInput[]): string[] {
  return validateContentInputs(inputs).issues.map((issue) => issue.rule);
}

describe("content validation", () => {
  it("accepts a valid versioned course graph", () => {
    const result = validateContentInputs(validInputs);
    expect(result.issues).toEqual([]);
    expect(result.documents).toHaveLength(7);
  });

  it("reports broken references with file, path and stable rule", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "activity-greetings.json").conceptIds = [
      "concept.missing",
    ];

    const result = validateContentInputs(inputs);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        file: "activity-greetings.json",
        path: "$.conceptIds[0]",
        rule: "REFERENCE_MISSING",
      }),
    );
  });

  it("rejects duplicate content IDs", () => {
    const inputs = fixtureInputs();
    inputs.push(structuredClone(inputs[6]) as ContentInput);

    expect(rulesFor(inputs)).toContain("ID_DUPLICATE");
  });

  it("rejects a published lesson without objectives", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "lesson-greetings.json").objectives = [];

    expect(rulesFor(inputs)).toContain("LESSON_OBJECTIVE_REQUIRED");
  });

  it("rejects an activity without evaluation", () => {
    const inputs = fixtureInputs();
    delete fixtureValue(inputs, "activity-greetings.json").evaluation;

    expect(rulesFor(inputs)).toContain("ACTIVITY_EVALUATION_REQUIRED");
  });

  it("rejects an activity without a concept link", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "activity-greetings.json").conceptIds = [];

    expect(rulesFor(inputs)).toContain("ACTIVITY_CONCEPT_REQUIRED");
  });

  it("rejects an activity linked to a missing lesson objective", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "activity-greetings.json").objectiveIds = [
      "objective.a0.missing",
    ];

    expect(rulesFor(inputs)).toContain("REFERENCE_MISSING");
  });

  it("rejects missing required source locale", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "lesson-greetings.json").title = {
      en: "Greetings",
    };

    expect(rulesFor(inputs)).toContain("LOCALE_REQUIRED");
  });

  it("rejects prerequisite cycles", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "lesson-greetings.json").prerequisiteLessonIds = [
      "lesson.a0.01.greetings",
    ];

    expect(rulesFor(inputs)).toContain("PREREQUISITE_CYCLE");
  });

  it("rejects unsupported schema revisions", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "course.json").schemaVersion = 2;

    expect(rulesFor(inputs)).toContain("SCHEMA_VERSION");
  });

  it("rejects published content that depends on draft content", () => {
    const inputs = fixtureInputs();
    fixtureValue(inputs, "concept-greetings.json").status = "draft";

    expect(rulesFor(inputs)).toContain("REFERENCE_STATUS");
  });
});
