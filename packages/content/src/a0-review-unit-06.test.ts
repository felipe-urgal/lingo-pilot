import { describe, expect, it } from "vitest";
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import reviewUnit06 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-06-present-simple.json" with { type: "json" };
import conceptEssentialVerbs from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/essential-verbs.json" with { type: "json" };
import conceptPresentSimpleBase from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/present-simple-base.json" with { type: "json" };
import conceptThirdPerson from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/present-simple-third-person.json" with { type: "json" };
import conceptNegative from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/present-simple-negative.json" with { type: "json" };
import conceptQuestions from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/present-simple-questions.json" with { type: "json" };
import conceptFrequency from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/frequency-adverbs.json" with { type: "json" };
import lesson031 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/031-essential-verbs.json" with { type: "json" };
import lesson032 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/032-present-simple-plural-subjects.json" with { type: "json" };
import lesson033 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/033-present-simple-third-person.json" with { type: "json" };
import lesson034 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/034-present-simple-negative.json" with { type: "json" };
import lesson035 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/035-present-simple-questions.json" with { type: "json" };
import lesson036 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/036-frequency-adverbs.json" with { type: "json" };
import activity031 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/031-use-essential-verb.json" with { type: "json" };
import activity032 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/032-use-present-simple-base.json" with { type: "json" };
import activity033 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/033-use-third-person.json" with { type: "json" };
import activity034 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/034-negate-present-simple.json" with { type: "json" };
import activity035 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/035-ask-present-simple.json" with { type: "json" };
import activity036 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/036-use-frequency-adverb.json" with { type: "json" };
import vocabGo from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/go.json" with { type: "json" };
import vocabWork from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/work.json" with { type: "json" };
import vocabLive from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/live.json" with { type: "json" };
import vocabStudy from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/study.json" with { type: "json" };
import vocabEat from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/eat.json" with { type: "json" };
import vocabDrink from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/drink.json" with { type: "json" };
import vocabAlways from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/always.json" with { type: "json" };
import vocabUsually from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/usually.json" with { type: "json" };
import vocabSometimes from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/sometimes.json" with { type: "json" };
import vocabNever from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/never.json" with { type: "json" };

const lessons = [lesson031, lesson032, lesson033, lesson034, lesson035, lesson036] as const;
const activities = [activity031, activity032, activity033, activity034, activity035, activity036] as const;
const concepts = [
  conceptEssentialVerbs,
  conceptPresentSimpleBase,
  conceptThirdPerson,
  conceptNegative,
  conceptQuestions,
  conceptFrequency,
] as const;
const vocabulary = [
  vocabGo,
  vocabWork,
  vocabLive,
  vocabStudy,
  vocabEat,
  vocabDrink,
  vocabAlways,
  vocabUsually,
  vocabSometimes,
  vocabNever,
] as const;

describe("A0 editorial review Unit 06", () => {
  it("keeps Unit 06 isolated from the published A0 catalog", () => {
    expect(reviewUnit06.status).toBe("review");
    expect(levelA0.unitIds).not.toContain(reviewUnit06.id);
    expect(reviewUnit06.lessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(lessons.every((lesson) => lesson.status === "review")).toBe(true);
    expect(activities.every((activity) => activity.status === "review")).toBe(true);
    expect(concepts.every((concept) => concept.status === "review")).toBe(true);
    expect(vocabulary.every((item) => item.status === "review")).toBe(true);
  });

  it("links every lesson objective to one deterministic activity", () => {
    for (const lesson of lessons) {
      const lessonActivities = activities.filter((activity) => activity.lessonId === lesson.id);
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

  it("preserves the Unit 05 bridge and explicit Unit 06 order", () => {
    const expectedPrerequisites = [
      [lesson031, "lesson.a0.030.can-requests-permission"],
      [lesson032, lesson031.id],
      [lesson033, lesson032.id],
      [lesson034, lesson033.id],
      [lesson035, lesson034.id],
      [lesson036, lesson035.id],
    ] as const;

    for (const [lesson, prerequisiteId] of expectedPrerequisites) {
      expect(lesson.prerequisiteLessonIds).toEqual([prerequisiteId]);
    }
  });

  it("uses semantic concept prerequisites rather than copying lesson order", () => {
    expect(conceptEssentialVerbs.prerequisiteConceptIds).toEqual([]);
    expect(conceptPresentSimpleBase.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.subject-pronouns",
      conceptEssentialVerbs.id,
    ]);
    expect(conceptThirdPerson.prerequisiteConceptIds).toEqual([
      conceptPresentSimpleBase.id,
    ]);
    expect(conceptNegative.prerequisiteConceptIds).toEqual([
      conceptPresentSimpleBase.id,
      conceptThirdPerson.id,
    ]);
    expect(conceptQuestions.prerequisiteConceptIds).toEqual([
      conceptNegative.id,
    ]);
    expect(conceptFrequency.prerequisiteConceptIds).toEqual([
      conceptPresentSimpleBase.id,
    ]);
  });

  it("tracks new lexical items at their first Unit 06 lesson", () => {
    const coreVerbs = [vocabGo, vocabWork, vocabLive, vocabStudy, vocabEat, vocabDrink];
    const frequencyWords = [vocabAlways, vocabUsually, vocabSometimes, vocabNever];

    expect(coreVerbs.every((item) => item.introducedInLessonId === lesson031.id)).toBe(true);
    expect(
      frequencyWords.every((item) => item.introducedInLessonId === lesson036.id),
    ).toBe(true);
    expect(lesson031.vocabularyIds).toEqual(coreVerbs.map((item) => item.id));
    expect(lesson036.vocabularyIds).toEqual([
      ...frequencyWords.map((item) => item.id),
      vocabWork.id,
      vocabStudy.id,
    ]);
  });
});
