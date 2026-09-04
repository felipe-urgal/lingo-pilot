import { describe, expect, it } from "vitest";
import course from "../../../content/courses/pt-BR_en/course.json" with { type: "json" };
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import bootstrapUnit from "../../../content/courses/pt-BR_en/levels/a0/unit.json" with { type: "json" };
import bootstrapLesson from "../../../content/courses/pt-BR_en/levels/a0/lesson-orientation.json" with { type: "json" };
import levelA1 from "../../../content/courses/pt-BR_en/levels/a1/level.json" with { type: "json" };
import unitA1 from "../../../content/courses/pt-BR_en/levels/a1/unit.json" with { type: "json" };
import levelA2 from "../../../content/courses/pt-BR_en/levels/a2/level.json" with { type: "json" };
import unitA2 from "../../../content/courses/pt-BR_en/levels/a2/unit.json" with { type: "json" };
import reviewUnit01 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-01-first-contact.json" with { type: "json" };
import reviewUnit02 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-02-personal-information.json" with { type: "json" };
import conceptLetters from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/letter-names.json" with { type: "json" };
import conceptGreetings from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/greetings.json" with { type: "json" };
import conceptIntroduction from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/self-introduction.json" with { type: "json" };
import conceptPronouns from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/subject-pronouns.json" with { type: "json" };
import conceptBe from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-affirmative.json" with { type: "json" };
import conceptContractions from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-contractions.json" with { type: "json" };
import conceptBeNegative from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-negative.json" with { type: "json" };
import conceptBeQuestions from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-questions.json" with { type: "json" };
import conceptBeShortAnswers from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/be-short-answers.json" with { type: "json" };
import conceptNumbersZeroTwenty from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/numbers-zero-to-twenty.json" with { type: "json" };
import conceptNumbersTwentyHundred from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/numbers-twenty-to-hundred.json" with { type: "json" };
import conceptAgePhone from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/age-and-phone.json" with { type: "json" };
import vocabHello from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/hello.json" with { type: "json" };
import vocabHi from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/hi.json" with { type: "json" };
import vocabMorning from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/good-morning.json" with { type: "json" };
import vocabGoodbye from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/goodbye.json" with { type: "json" };
import vocabName from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/name.json" with { type: "json" };
import vocabFrom from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/from.json" with { type: "json" };
import vocabBrazil from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/brazil.json" with { type: "json" };
import vocabNot from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/not.json" with { type: "json" };
import vocabYes from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/yes.json" with { type: "json" };
import vocabNo from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/no.json" with { type: "json" };
import lesson001 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/001-alphabet-spelling.json" with { type: "json" };
import lesson002 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/002-essential-greetings.json" with { type: "json" };
import lesson003 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/003-self-introduction.json" with { type: "json" };
import lesson004 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/004-subject-pronouns.json" with { type: "json" };
import lesson005 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/005-be-affirmative.json" with { type: "json" };
import lesson006 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/006-be-contractions.json" with { type: "json" };
import lesson007 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/007-be-negative.json" with { type: "json" };
import lesson008 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/008-be-questions.json" with { type: "json" };
import lesson009 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/009-be-short-answers.json" with { type: "json" };
import lesson010 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/010-numbers-0-20.json" with { type: "json" };
import lesson011 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/011-numbers-20-100.json" with { type: "json" };
import lesson012 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/012-age-and-phone.json" with { type: "json" };
import activity001 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/001-spell-short-name.json" with { type: "json" };
import activity002 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/002-complete-morning-greeting.json" with { type: "json" };
import activity003 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/003-translate-name-introduction.json" with { type: "json" };
import activity004 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/004-choose-she.json" with { type: "json" };
import activity005 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/005-complete-we-are.json" with { type: "json" };
import activity006 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/006-contract-i-am.json" with { type: "json" };
import activity007 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/007-negate-with-be.json" with { type: "json" };
import activity008 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/008-form-be-question.json" with { type: "json" };
import activity009 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/009-answer-no-with-be.json" with { type: "json" };
import activity010 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/010-write-zero-to-twenty.json" with { type: "json" };
import activity011 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/011-write-twenty-to-hundred.json" with { type: "json" };
import activity012 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/012-state-age-phone.json" with { type: "json" };
import type { Activity, Lesson, Unit } from "./model.ts";
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
  { file: "review/unit-01.json", value: reviewUnit01 },
  { file: "review/unit-02.json", value: reviewUnit02 },
  { file: "review/concept-letters.json", value: conceptLetters },
  { file: "review/concept-greetings.json", value: conceptGreetings },
  { file: "review/concept-introduction.json", value: conceptIntroduction },
  { file: "review/concept-pronouns.json", value: conceptPronouns },
  { file: "review/concept-be.json", value: conceptBe },
  { file: "review/concept-contractions.json", value: conceptContractions },
  { file: "review/concept-be-negative.json", value: conceptBeNegative },
  { file: "review/concept-be-questions.json", value: conceptBeQuestions },
  {
    file: "review/concept-be-short-answers.json",
    value: conceptBeShortAnswers,
  },
  {
    file: "review/concept-numbers-zero-twenty.json",
    value: conceptNumbersZeroTwenty,
  },
  {
    file: "review/concept-numbers-twenty-hundred.json",
    value: conceptNumbersTwentyHundred,
  },
  { file: "review/concept-age-phone.json", value: conceptAgePhone },
  { file: "review/vocab-hello.json", value: vocabHello },
  { file: "review/vocab-hi.json", value: vocabHi },
  { file: "review/vocab-morning.json", value: vocabMorning },
  { file: "review/vocab-goodbye.json", value: vocabGoodbye },
  { file: "review/vocab-name.json", value: vocabName },
  { file: "review/vocab-from.json", value: vocabFrom },
  { file: "review/vocab-brazil.json", value: vocabBrazil },
  { file: "review/vocab-not.json", value: vocabNot },
  { file: "review/vocab-yes.json", value: vocabYes },
  { file: "review/vocab-no.json", value: vocabNo },
  { file: "review/lesson-001.json", value: lesson001 },
  { file: "review/lesson-002.json", value: lesson002 },
  { file: "review/lesson-003.json", value: lesson003 },
  { file: "review/lesson-004.json", value: lesson004 },
  { file: "review/lesson-005.json", value: lesson005 },
  { file: "review/lesson-006.json", value: lesson006 },
  { file: "review/lesson-007.json", value: lesson007 },
  { file: "review/lesson-008.json", value: lesson008 },
  { file: "review/lesson-009.json", value: lesson009 },
  { file: "review/lesson-010.json", value: lesson010 },
  { file: "review/lesson-011.json", value: lesson011 },
  { file: "review/lesson-012.json", value: lesson012 },
  { file: "review/activity-001.json", value: activity001 },
  { file: "review/activity-002.json", value: activity002 },
  { file: "review/activity-003.json", value: activity003 },
  { file: "review/activity-004.json", value: activity004 },
  { file: "review/activity-005.json", value: activity005 },
  { file: "review/activity-006.json", value: activity006 },
  { file: "review/activity-007.json", value: activity007 },
  { file: "review/activity-008.json", value: activity008 },
  { file: "review/activity-009.json", value: activity009 },
  { file: "review/activity-010.json", value: activity010 },
  { file: "review/activity-011.json", value: activity011 },
  { file: "review/activity-012.json", value: activity012 },
];

function lessonById(lessons: readonly Lesson[], id: string): Lesson {
  const lesson = lessons.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Review lesson not loaded: ${id}`);
  return lesson;
}

describe("A0 editorial review content", () => {
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
    expect(
      result.documents.filter((loaded) => loaded.document.status === "review"),
    ).toHaveLength(48);
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
