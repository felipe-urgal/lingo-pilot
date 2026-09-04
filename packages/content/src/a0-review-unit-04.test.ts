import { describe, expect, it } from "vitest";
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import reviewUnit04 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-04-people-and-possessions.json" with { type: "json" };
import conceptDemonstratives from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/demonstratives.json" with { type: "json" };
import conceptPossessives from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/possessive-adjectives.json" with { type: "json" };
import conceptFamily from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/family.json" with { type: "json" };
import conceptHaveHas from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/have-has.json" with { type: "json" };
import conceptColors from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/colors.json" with { type: "json" };
import conceptObjects from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/everyday-objects.json" with { type: "json" };
import lesson019 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/019-demonstratives.json" with { type: "json" };
import lesson020 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/020-possessive-adjectives.json" with { type: "json" };
import lesson021 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/021-family.json" with { type: "json" };
import lesson022 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/022-have-has.json" with { type: "json" };
import lesson023 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/023-colors.json" with { type: "json" };
import lesson024 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/024-everyday-objects.json" with { type: "json" };
import activity019 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/019-choose-demonstrative.json" with { type: "json" };
import activity020 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/020-choose-possessive-adjective.json" with { type: "json" };
import activity021 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/021-name-family.json" with { type: "json" };
import activity022 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/022-use-have-has.json" with { type: "json" };
import activity023 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/023-name-colors.json" with { type: "json" };
import activity024 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/024-name-everyday-objects.json" with { type: "json" };
import vocabMother from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/mother.json" with { type: "json" };
import vocabFather from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/father.json" with { type: "json" };
import vocabSister from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/sister.json" with { type: "json" };
import vocabBrother from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/brother.json" with { type: "json" };
import vocabRed from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/red.json" with { type: "json" };
import vocabBlue from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/blue.json" with { type: "json" };
import vocabBlack from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/black.json" with { type: "json" };
import vocabWhite from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/white.json" with { type: "json" };
import vocabPhone from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/phone.json" with { type: "json" };
import vocabKey from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/key.json" with { type: "json" };
import vocabBag from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/bag.json" with { type: "json" };
import vocabBook from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/book.json" with { type: "json" };

const lessons = [
  lesson019,
  lesson020,
  lesson021,
  lesson022,
  lesson023,
  lesson024,
] as const;
const activities = [
  activity019,
  activity020,
  activity021,
  activity022,
  activity023,
  activity024,
] as const;
const concepts = [
  conceptDemonstratives,
  conceptPossessives,
  conceptFamily,
  conceptHaveHas,
  conceptColors,
  conceptObjects,
] as const;
const vocabulary = [
  vocabMother,
  vocabFather,
  vocabSister,
  vocabBrother,
  vocabRed,
  vocabBlue,
  vocabBlack,
  vocabWhite,
  vocabPhone,
  vocabKey,
  vocabBag,
  vocabBook,
] as const;

describe("A0 editorial review Unit 04", () => {
  it("keeps Unit 04 isolated from the published A0 catalog", () => {
    expect(reviewUnit04.status).toBe("review");
    expect(levelA0.unitIds).not.toContain(reviewUnit04.id);
    expect(reviewUnit04.lessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(lessons.every((lesson) => lesson.status === "review")).toBe(true);
    expect(activities.every((activity) => activity.status === "review")).toBe(
      true,
    );
    expect(concepts.every((concept) => concept.status === "review")).toBe(true);
    expect(vocabulary.every((item) => item.status === "review")).toBe(true);
  });

  it("links every Unit 04 objective to one deterministic activity", () => {
    for (const lesson of lessons) {
      const lessonActivities = activities.filter(
        (activity) => activity.lessonId === lesson.id,
      );
      expect(lessonActivities).toHaveLength(1);
      expect(
        lesson.objectives.every((objective) =>
          lessonActivities.some(
            (activity) =>
              activity.evaluation.type === "deterministic" &&
              activity.objectiveIds.includes(objective.id),
          ),
        ),
      ).toBe(true);
    }
  });

  it("preserves the Unit 03 bridge and explicit Unit 04 order", () => {
    const expectedPrerequisites = [
      [lesson019, "lesson.a0.018.irregular-plurals"],
      [lesson020, lesson019.id],
      [lesson021, lesson020.id],
      [lesson022, lesson021.id],
      [lesson023, lesson022.id],
      [lesson024, lesson023.id],
    ] as const;

    for (const [lesson, prerequisiteId] of expectedPrerequisites) {
      expect(lesson.prerequisiteLessonIds).toEqual([prerequisiteId]);
    }
  });

  it("keeps concept prerequisites pedagogical rather than positional", () => {
    expect(conceptDemonstratives.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.regular-plurals",
    ]);
    expect(conceptPossessives.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.subject-pronouns",
    ]);
    expect(conceptFamily.prerequisiteConceptIds).toEqual([]);
    expect(conceptHaveHas.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.subject-pronouns",
    ]);
    expect(conceptColors.prerequisiteConceptIds).toEqual([]);
    expect(conceptObjects.prerequisiteConceptIds).toEqual([]);
  });

  it("introduces lexical vocabulary only in family, color and object lessons", () => {
    const byLesson = new Map<string, string[]>();
    for (const item of vocabulary) {
      const ids = byLesson.get(item.introducedInLessonId) ?? [];
      ids.push(item.id);
      byLesson.set(item.introducedInLessonId, ids);
    }

    expect(byLesson.get(lesson021.id)?.sort()).toEqual(
      [...lesson021.vocabularyIds].sort(),
    );
    expect(byLesson.get(lesson023.id)?.sort()).toEqual(
      [...lesson023.vocabularyIds].sort(),
    );
    expect(byLesson.get(lesson024.id)?.sort()).toEqual(
      [...lesson024.vocabularyIds].sort(),
    );
    expect(lesson019.vocabularyIds).toEqual([]);
    expect(lesson020.vocabularyIds).toEqual([]);
    expect(lesson022.vocabularyIds).toEqual([]);
  });
});
