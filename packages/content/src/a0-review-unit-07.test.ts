import { describe, expect, it } from "vitest";
import levelA0 from "../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import reviewUnit07 from "../../../content/courses/pt-BR_en/levels/a0/review/unit-07-everyday-survival.json" with { type: "json" };
import conceptDailyRoutine from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/daily-routine.json" with { type: "json" };
import conceptFoodAndDrinks from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/food-and-drinks.json" with { type: "json" };
import conceptPreferenceVerbs from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/preference-verbs.json" with { type: "json" };
import conceptQuestionWords from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/question-words.json" with { type: "json" };
import conceptBasicAdjectives from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/basic-adjectives.json" with { type: "json" };
import conceptDescribePeople from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/describe-people.json" with { type: "json" };
import conceptSurvivalDialogues from "../../../content/courses/pt-BR_en/levels/a0/review/concepts/survival-dialogues.json" with { type: "json" };
import lesson037 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/037-daily-routine.json" with { type: "json" };
import lesson038 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/038-food-and-drinks.json" with { type: "json" };
import lesson039 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/039-like-love-hate.json" with { type: "json" };
import lesson040 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/040-question-words.json" with { type: "json" };
import lesson041 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/041-adjectives-opposites.json" with { type: "json" };
import lesson042 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/042-describe-people.json" with { type: "json" };
import lesson043 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/043-survival-dialogues.json" with { type: "json" };
import activity037 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/037-describe-daily-routine.json" with { type: "json" };
import activity038 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/038-use-food-and-drink.json" with { type: "json" };
import activity039 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/039-express-basic-preference.json" with { type: "json" };
import activity040 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/040-choose-question-word.json" with { type: "json" };
import activity041 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/041-use-basic-adjective.json" with { type: "json" };
import activity042 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/042-describe-person.json" with { type: "json" };
import activity043 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/043-complete-survival-exchange.json" with { type: "json" };
import vocabWakeUp from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/wake-up.json" with { type: "json" };
import vocabStart from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/start.json" with { type: "json" };
import vocabFinish from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/finish.json" with { type: "json" };
import vocabWater from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/water.json" with { type: "json" };
import vocabCoffee from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/coffee.json" with { type: "json" };
import vocabBread from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/bread.json" with { type: "json" };
import vocabRice from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/rice.json" with { type: "json" };
import vocabLike from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/like.json" with { type: "json" };
import vocabLove from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/love.json" with { type: "json" };
import vocabHate from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/hate.json" with { type: "json" };
import vocabWhat from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/what.json" with { type: "json" };
import vocabWho from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/who.json" with { type: "json" };
import vocabWhere from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/where.json" with { type: "json" };
import vocabWhen from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/when.json" with { type: "json" };
import vocabHow from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/how.json" with { type: "json" };
import vocabBig from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/big.json" with { type: "json" };
import vocabSmall from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/small.json" with { type: "json" };
import vocabNew from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/new.json" with { type: "json" };
import vocabOld from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/old.json" with { type: "json" };
import vocabGood from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/good.json" with { type: "json" };
import vocabBad from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/bad.json" with { type: "json" };
import vocabTall from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/tall.json" with { type: "json" };
import vocabShort from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/short.json" with { type: "json" };
import vocabHair from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/hair.json" with { type: "json" };
import vocabEyes from "../../../content/courses/pt-BR_en/levels/a0/review/vocabulary/eyes.json" with { type: "json" };

const lessons = [lesson037, lesson038, lesson039, lesson040, lesson041, lesson042, lesson043] as const;
const activities = [activity037, activity038, activity039, activity040, activity041, activity042, activity043] as const;
const concepts = [conceptDailyRoutine, conceptFoodAndDrinks, conceptPreferenceVerbs, conceptQuestionWords, conceptBasicAdjectives, conceptDescribePeople, conceptSurvivalDialogues] as const;
const vocabulary = [vocabWakeUp, vocabStart, vocabFinish, vocabWater, vocabCoffee, vocabBread, vocabRice, vocabLike, vocabLove, vocabHate, vocabWhat, vocabWho, vocabWhere, vocabWhen, vocabHow, vocabBig, vocabSmall, vocabNew, vocabOld, vocabGood, vocabBad, vocabTall, vocabShort, vocabHair, vocabEyes] as const;

describe("A0 editorial review Unit 07", () => {
  it("keeps Unit 07 isolated from the published A0 catalog", () => {
    expect(reviewUnit07.status).toBe("review");
    expect(levelA0.unitIds).not.toContain(reviewUnit07.id);
    expect(reviewUnit07.lessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(lessons.every((lesson) => lesson.status === "review")).toBe(true);
    expect(activities.every((activity) => activity.status === "review")).toBe(true);
    expect(concepts.every((concept) => concept.status === "review")).toBe(true);
    expect(vocabulary.every((item) => item.status === "review")).toBe(true);
  });

  it("links every lesson objective to one deterministic activity", () => {
    for (const lesson of lessons) {
      const lessonActivities = activities.filter((activity) => activity.lessonId === lesson.id);
      expect(lessonActivities).toHaveLength(1);
      expect(lesson.objectives.every((objective) => lessonActivities.some((activity) => activity.evaluation.type === "deterministic" && activity.objectiveIds.includes(objective.id)))).toBe(true);
    }
  });

  it("preserves the Unit 06 bridge and explicit Unit 07 order", () => {
    const expectedPrerequisites = [
      [lesson037, "lesson.a0.036.frequency-adverbs"],
      [lesson038, lesson037.id],
      [lesson039, lesson038.id],
      [lesson040, lesson039.id],
      [lesson041, lesson040.id],
      [lesson042, lesson041.id],
      [lesson043, lesson042.id],
    ] as const;
    for (const [lesson, prerequisiteId] of expectedPrerequisites) expect(lesson.prerequisiteLessonIds).toEqual([prerequisiteId]);
  });

  it("uses semantic concept prerequisites for integrated A0 survival language", () => {
    expect(conceptDailyRoutine.prerequisiteConceptIds).toEqual(["concept.a0.grammar.present-simple-base", "concept.a0.time.clock-time", "concept.a0.grammar.frequency-adverbs"]);
    expect(conceptFoodAndDrinks.prerequisiteConceptIds).toEqual([]);
    expect(conceptPreferenceVerbs.prerequisiteConceptIds).toEqual(["concept.a0.grammar.present-simple-base"]);
    expect(conceptQuestionWords.prerequisiteConceptIds).toEqual(["concept.a0.grammar.present-simple-questions", "concept.a0.grammar.be-questions"]);
    expect(conceptBasicAdjectives.prerequisiteConceptIds).toEqual([]);
    expect(conceptDescribePeople.prerequisiteConceptIds).toEqual(["concept.a0.grammar.be-affirmative", "concept.a0.grammar.have-has", "concept.a0.lexicon.basic-adjectives"]);
    expect(conceptSurvivalDialogues.prerequisiteConceptIds).toEqual(["concept.a0.communication.greetings", "concept.a0.grammar.can-requests-permission", "concept.a0.lexicon.food-and-drinks"]);
  });

  it("tracks new lexical items at their first Unit 07 lesson", () => {
    for (const item of vocabulary) expect(lessons.map((lesson) => lesson.id)).toContain(item.introducedInLessonId);
    expect(lesson037.vocabularyIds).toContain("vocab.wake-up");
    expect(lesson038.vocabularyIds).toEqual(["vocab.water", "vocab.coffee", "vocab.bread", "vocab.rice", "vocab.eat", "vocab.drink"]);
    expect(lesson043.vocabularyIds).toEqual(["vocab.hello", "vocab.please", "vocab.drink", "vocab.water", "vocab.yes"]);
  });

  it("finishes A0 without inventing new vocabulary in the integration lesson", () => {
    const newlyIntroducedInFinalLesson = vocabulary.filter((item) => item.introducedInLessonId === lesson043.id);
    expect(newlyIntroducedInFinalLesson).toHaveLength(0);
  });
});
