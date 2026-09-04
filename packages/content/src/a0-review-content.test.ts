import { describe, expect, it } from "vitest";
import course from "../../../content/courses/pt-BR_en/course.json" with { type: "json" };
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import bootstrapUnit from "../../../content/courses/pt-BR_en/levels/a0/unit.json" with { type: "json" };
import bootstrapLesson from "../../../content/courses/pt-BR_en/levels/a0/lesson-orientation.json" with { type: "json" };
import levelA1 from "../../../content/courses/pt-BR_en/levels/a1/level.json" with { type: "json" };
import unitA1 from "../../../content/courses/pt-BR_en/levels/a1/unit.json" with { type: "json" };
import levelA2 from "../../../content/courses/pt-BR_en/levels/a2/level.json" with { type: "json" };
import unitA2 from "../../../content/courses/pt-BR_en/levels/a2/unit.json" with { type: "json" };
import reviewUnit from "../../../content/courses/pt-BR_en/levels/a0/review/unit-01-first-contact.json" with { type: "json" };
import conceptLetters from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/letter-names.json" with { type: "json" };
import conceptGreetings from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/greetings.json" with { type: "json" };
import conceptIntroduction from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/self-introduction.json" with { type: "json" };
import conceptPronouns from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/subject-pronouns.json" with { type: "json" };
import conceptBe from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-affirmative.json" with { type: "json" };
import conceptContractions from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-contractions.json" with { type: "json" };
import vocabHello from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/hello.json" with { type: "json" };
import vocabHi from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/hi.json" with { type: "json" };
import vocabMorning from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/good-morning.json" with { type: "json" };
import vocabGoodbye from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/goodbye.json" with { type: "json" };
import vocabName from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/name.json" with { type: "json" };
import vocabFrom from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/from.json" with { type: "json" };
import vocabBrazil from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/brazil.json" with { type: "json" };
import lesson001 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/001-alphabet-spelling.json" with { type: "json" };
import lesson002 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/002-essential-greetings.json" with { type: "json" };
import lesson003 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/003-self-introduction.json" with { type: "json" };
import lesson004 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/004-subject-pronouns.json" with { type: "json" };
import lesson005 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/005-be-affirmative.json" with { type: "json" };
import lesson006 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/006-be-contractions.json" with { type: "json" };
import activity001 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/001-spell-short-name.json" with { type: "json" };
import activity002 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/002-complete-morning-greeting.json" with { type: "json" };
import activity003 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/003-translate-name-introduction.json" with { type: "json" };
import activity004 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/004-choose-she.json" with { type: "json" };
import activity005 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/005-complete-we-are.json" with { type: "json" };
import activity006 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/006-contract-i-am.json" with { type: "json" };
import type { ContentInput } from "./validator.ts";
import { validateContentInputs } from "./validator.ts";

const inputs: readonly ContentInput[] = [
  { file: "course.json", value: course },
  { file: "level-a0.json", value: levelA0 },
  { file: "unit-bootstrap.json", value: bootstrapUnit },
  { file: "lesson-bootstrap.json", value: bootstrapLesson },
  { file: "level-a1.json", value: levelA1 },
  { file: "unit-a1.json", value: unitA1 },
  { file: "level-a2.json", value: levelA2 },
  { file: "unit-a2.json", value: unitA2 },
  { file: "review/unit-01.json", value: reviewUnit },
  { file: "review/concept-letters.json", value: conceptLetters },
  { file: "review/concept-greetings.json", value: conceptGreetings },
  { file: "review/concept-introduction.json", value: conceptIntroduction },
  { file: "review/concept-pronouns.json", value: conceptPronouns },
  { file: "review/concept-be.json", value: conceptBe },
  { file: "review/concept-contractions.json", value: conceptContractions },
  { file: "review/vocab-hello.json", value: vocabHello },
  { file: "review/vocab-hi.json", value: vocabHi },
  { file: "review/vocab-morning.json", value: vocabMorning },
  { file: "review/vocab-goodbye.json", value: vocabGoodbye },
  { file: "review/vocab-name.json", value: vocabName },
  { file: "review/vocab-from.json", value: vocabFrom },
  { file: "review/vocab-brazil.json", value: vocabBrazil },
  { file: "review/lesson-001.json", value: lesson001 },
  { file: "review/lesson-002.json", value: lesson002 },
  { file: "review/lesson-003.json", value: lesson003 },
  { file: "review/lesson-004.json", value: lesson004 },
  { file: "review/lesson-005.json", value: lesson005 },
  { file: "review/lesson-006.json", value: lesson006 },
  { file: "review/activity-001.json", value: activity001 },
  { file: "review/activity-002.json", value: activity002 },
  { file: "review/activity-003.json", value: activity003 },
  { file: "review/activity-004.json", value: activity004 },
  { file: "review/activity-005.json", value: activity005 },
  { file: "review/activity-006.json", value: activity006 },
];

describe("A0 editorial review content", () => {
  it("validates Unit 01 against the real course graph without publishing it", () => {
    const result = validateContentInputs(inputs);

    expect(result.issues).toEqual([]);
    const a0 = result.documents.find(
      (loaded) => loaded.document.id === "level.a0",
    )?.document;
    expect(a0?.kind).toBe("level");
    if (a0?.kind !== "level") throw new Error("A0 level not loaded");
    expect(a0.unitIds).not.toContain("unit.a0.01.first-contact");

    const reviewDocuments = result.documents.filter(
      (loaded) => loaded.document.status === "review",
    );
    expect(reviewDocuments).toHaveLength(26);
  });

  it("links every review lesson objective to at least one deterministic activity", () => {
    const result = validateContentInputs(inputs);
    const documents = result.documents.map((loaded) => loaded.document);
    const activities = documents.filter(
      (document) => document.kind === "activity" && document.status === "review",
    );
    const lessons = documents.filter(
      (document) => document.kind === "lesson" && document.status === "review",
    );

    expect(lessons).toHaveLength(6);
    expect(activities).toHaveLength(6);
    for (const lesson of lessons) {
      const coveredObjectives = new Set(
        activities
          .filter((activity) => activity.lessonId === lesson.id)
          .flatMap((activity) => activity.objectiveIds),
      );
      expect(lesson.objectives.every((objective) => coveredObjectives.has(objective.id))).toBe(true);
    }
  });
});
