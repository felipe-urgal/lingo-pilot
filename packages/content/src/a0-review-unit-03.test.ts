import { describe, expect, it } from "vitest";
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import reviewUnit03 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-03-time-and-basic-nouns.json" with { type: "json" };
import conceptDays from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/days-of-week.json" with { type: "json" };
import conceptMonthsDates from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/months-and-dates.json" with { type: "json" };
import conceptClockTime from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/clock-time.json" with { type: "json" };
import conceptArticles from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/indefinite-articles.json" with { type: "json" };
import conceptRegularPlurals from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/regular-plurals.json" with { type: "json" };
import conceptIrregularPlurals from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/irregular-plurals.json" with { type: "json" };
import lesson013 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/013-days-of-week.json" with { type: "json" };
import lesson014 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/014-months-and-dates.json" with { type: "json" };
import lesson015 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/015-telling-time.json" with { type: "json" };
import lesson016 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/016-articles-a-an.json" with { type: "json" };
import lesson017 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/017-regular-plurals.json" with { type: "json" };
import lesson018 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/018-irregular-plurals.json" with { type: "json" };
import activity013 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/013-name-days-of-week.json" with { type: "json" };
import activity014 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/014-write-basic-date.json" with { type: "json" };
import activity015 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/015-tell-half-past-time.json" with { type: "json" };
import activity016 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/016-choose-an.json" with { type: "json" };
import activity017 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/017-form-regular-plural.json" with { type: "json" };
import activity018 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/018-form-irregular-plural.json" with { type: "json" };

const lessons = [
  lesson013,
  lesson014,
  lesson015,
  lesson016,
  lesson017,
  lesson018,
] as const;

const activities = [
  activity013,
  activity014,
  activity015,
  activity016,
  activity017,
  activity018,
] as const;

const concepts = [
  conceptDays,
  conceptMonthsDates,
  conceptClockTime,
  conceptArticles,
  conceptRegularPlurals,
  conceptIrregularPlurals,
] as const;

describe("A0 editorial review Unit 03", () => {
  it("keeps Unit 03 isolated from the published A0 catalog", () => {
    expect(reviewUnit03.status).toBe("review");
    expect(levelA0.unitIds).not.toContain(reviewUnit03.id);
    expect(reviewUnit03.lessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(lessons.every((lesson) => lesson.status === "review")).toBe(true);
    expect(activities.every((activity) => activity.status === "review")).toBe(
      true,
    );
  });

  it("links every Unit 03 objective to a deterministic activity", () => {
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

  it("preserves the Unit 02 bridge and the explicit Unit 03 lesson order", () => {
    const expectedPrerequisites = [
      [lesson013, "lesson.a0.012.age-and-phone"],
      [lesson014, lesson013.id],
      [lesson015, lesson014.id],
      [lesson016, lesson015.id],
      [lesson017, lesson016.id],
      [lesson018, lesson017.id],
    ] as const;

    for (const [lesson, prerequisiteId] of expectedPrerequisites) {
      expect(lesson.prerequisiteLessonIds).toEqual([prerequisiteId]);
    }
  });

  it("keeps concept prerequisites selective instead of copying lesson order", () => {
    expect(concepts.map((concept) => concept.id)).toEqual([
      "concept.a0.calendar.days-of-week",
      "concept.a0.calendar.months-and-dates",
      "concept.a0.time.clock-time",
      "concept.a0.grammar.indefinite-articles",
      "concept.a0.grammar.regular-plurals",
      "concept.a0.grammar.irregular-plurals",
    ]);
    expect(conceptDays.prerequisiteConceptIds).toEqual([]);
    expect(conceptMonthsDates.prerequisiteConceptIds).toEqual([
      "concept.a0.numbers.twenty-to-hundred",
    ]);
    expect(conceptClockTime.prerequisiteConceptIds).toEqual([
      "concept.a0.numbers.zero-to-twenty",
    ]);
    expect(conceptArticles.prerequisiteConceptIds).toEqual([]);
    expect(conceptRegularPlurals.prerequisiteConceptIds).toEqual([]);
    expect(conceptIrregularPlurals.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.regular-plurals",
    ]);
  });
});
