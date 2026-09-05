import { describe, expect, it } from "vitest";
import lesson037 from "../../../content/courses/pt-BR_en/levels/a0/review/lessons/037-daily-routine.json" with { type: "json" };
import activity037 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/037-describe-daily-routine.json" with { type: "json" };
import activity043 from "../../../content/courses/pt-BR_en/levels/a0/review/activities/043-complete-survival-exchange.json" with { type: "json" };

describe("A0 Unit 07 activity contracts", () => {
  it("makes the routine time connector explicit and evaluates frequency plus time", () => {
    expect(
      lesson037.blocks.some(
        (block) =>
          block.type === "rule" &&
          block.text["pt-BR"]?.includes("at + horário"),
      ),
    ).toBe(true);
    expect(activity037.conceptIds).toContain(
      "concept.a0.grammar.frequency-adverbs",
    );
    expect(activity037.evaluation.acceptedAnswers).toEqual(
      expect.arrayContaining([
        "i usually wake up at seven",
        "i usually wake up at 7",
      ]),
    );
  });

  it("accepts both taught greetings in the final integration activity", () => {
    expect(activity043.evaluation.acceptedAnswers).toEqual(
      expect.arrayContaining([
        "hello can i drink water please",
        "hi can i drink water please",
      ]),
    );
  });
});
