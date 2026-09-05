import { describe, expect, it } from "vitest";
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import reviewUnit05 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-05-places-and-ability.json" with { type: "json" };
import conceptThereIsAre from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/there-is-are.json" with { type: "json" };
import conceptPlacePrepositions from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/place-prepositions.json" with { type: "json" };
import conceptRoomsAtHome from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/rooms-at-home.json" with { type: "json" };
import conceptImperatives from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/imperatives.json" with { type: "json" };
import conceptCanAbility from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/can-ability.json" with { type: "json" };
import conceptCanRequests from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/can-requests-permission.json" with { type: "json" };
import lesson025 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/025-there-is-are.json" with { type: "json" };
import lesson026 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/026-place-prepositions.json" with { type: "json" };
import lesson027 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/027-rooms-at-home.json" with { type: "json" };
import lesson028 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/028-imperatives.json" with { type: "json" };
import lesson029 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/029-can-ability.json" with { type: "json" };
import lesson030 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/030-can-requests-permission.json" with { type: "json" };
import activity025 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/025-use-there-is-are.json" with { type: "json" };
import activity026 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/026-choose-place-preposition.json" with { type: "json" };
import activity027 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/027-name-room.json" with { type: "json" };
import activity028 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/028-use-imperative.json" with { type: "json" };
import activity029 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/029-use-can-ability.json" with { type: "json" };
import activity030 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/030-make-can-request.json" with { type: "json" };
import vocabKitchen from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/kitchen.json" with { type: "json" };
import vocabBedroom from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/bedroom.json" with { type: "json" };
import vocabBathroom from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/bathroom.json" with { type: "json" };
import vocabOpen from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/open.json" with { type: "json" };
import vocabClose from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/close.json" with { type: "json" };
import vocabSit from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/sit.json" with { type: "json" };
import vocabCome from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/come.json" with { type: "json" };
import vocabSwim from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/swim.json" with { type: "json" };
import vocabCook from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/cook.json" with { type: "json" };
import vocabDrive from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/drive.json" with { type: "json" };
import vocabPlease from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/please.json" with { type: "json" };

const lessons = [lesson025, lesson026, lesson027, lesson028, lesson029, lesson030] as const;
const activities = [activity025, activity026, activity027, activity028, activity029, activity030] as const;
const concepts = [
  conceptThereIsAre,
  conceptPlacePrepositions,
  conceptRoomsAtHome,
  conceptImperatives,
  conceptCanAbility,
  conceptCanRequests,
] as const;
const vocabulary = [
  vocabKitchen,
  vocabBedroom,
  vocabBathroom,
  vocabOpen,
  vocabClose,
  vocabSit,
  vocabCome,
  vocabSwim,
  vocabCook,
  vocabDrive,
  vocabPlease,
] as const;

describe("A0 editorial review Unit 05", () => {
  it("keeps Unit 05 isolated from the published A0 catalog", () => {
    expect(reviewUnit05.status).toBe("review");
    expect(levelA0.unitIds).not.toContain(reviewUnit05.id);
    expect(reviewUnit05.lessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(lessons.every((lesson) => lesson.status === "review")).toBe(true);
    expect(activities.every((activity) => activity.status === "review")).toBe(true);
    expect(concepts.every((concept) => concept.status === "review")).toBe(true);
    expect(vocabulary.every((item) => item.status === "review")).toBe(true);
  });

  it("links every objective to one deterministic activity", () => {
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

  it("preserves the Unit 04 bridge and explicit Unit 05 order", () => {
    const expectedPrerequisites = [
      [lesson025, "lesson.a0.024.everyday-objects"],
      [lesson026, lesson025.id],
      [lesson027, lesson026.id],
      [lesson028, lesson027.id],
      [lesson029, lesson028.id],
      [lesson030, lesson029.id],
    ] as const;

    for (const [lesson, prerequisiteId] of expectedPrerequisites) {
      expect(lesson.prerequisiteLessonIds).toEqual([prerequisiteId]);
    }
  });

  it("keeps concept prerequisites selective and semantic", () => {
    expect(conceptThereIsAre.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.regular-plurals",
    ]);
    expect(conceptPlacePrepositions.prerequisiteConceptIds).toEqual([]);
    expect(conceptRoomsAtHome.prerequisiteConceptIds).toEqual([]);
    expect(conceptImperatives.prerequisiteConceptIds).toEqual([]);
    expect(conceptCanAbility.prerequisiteConceptIds).toEqual([
      "concept.a0.grammar.subject-pronouns",
    ]);
    expect(conceptCanRequests.prerequisiteConceptIds).toEqual([
      conceptCanAbility.id,
    ]);
  });

  it("introduces only lexical vocabulary that belongs to Units 05 lessons", () => {
    expect(lesson025.vocabularyIds).toEqual([]);
    expect(lesson026.vocabularyIds).toEqual([]);
    expect(lesson027.vocabularyIds).toEqual([
      vocabKitchen.id,
      vocabBedroom.id,
      vocabBathroom.id,
    ]);
    expect(lesson028.vocabularyIds).toEqual([
      vocabOpen.id,
      vocabClose.id,
      vocabSit.id,
      vocabCome.id,
    ]);
    expect(lesson029.vocabularyIds).toEqual([
      vocabSwim.id,
      vocabCook.id,
      vocabDrive.id,
    ]);
    expect(lesson030.vocabularyIds).toEqual([vocabPlease.id]);

    for (const item of vocabulary) {
      expect(lessons.map((lesson) => lesson.id)).toContain(item.introducedInLessonId);
    }
  });
});
