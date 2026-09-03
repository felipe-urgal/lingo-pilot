import { describe, expect, it } from "vitest";
import {
  evaluateActivity,
  type ActivityAnswer,
  type DeterministicActivityDefinition,
} from "./activity-engine.ts";

describe("deterministic activity engine", () => {
  it("evaluates single and multiple choice without accepting duplicate selections", () => {
    expect(
      evaluateActivity(
        {
          type: "single-choice",
          choiceIds: ["a", "b"],
          correctChoiceId: "b",
        },
        "b",
      ),
    ).toMatchObject({ ok: true, evaluation: { correct: true } });

    expect(
      evaluateActivity(
        {
          type: "multiple-choice",
          choiceIds: ["a", "b", "c"],
          correctChoiceIds: ["a", "c"],
        },
        ["c", "a"],
      ),
    ).toMatchObject({ ok: true, evaluation: { correct: true } });

    expect(
      evaluateActivity(
        {
          type: "multiple-choice",
          choiceIds: ["a", "b", "c"],
          correctChoiceIds: ["a", "c"],
        },
        ["a", "a"],
      ),
    ).toMatchObject({ ok: true, evaluation: { correct: false } });
  });

  it("normalizes Unicode, whitespace and locale-aware case without dropping accents", () => {
    const definition = {
      type: "translation" as const,
      acceptedAnswers: ["I am ready"],
      normalization: { locale: "en" },
    };

    expect(evaluateActivity(definition, "  i   AM ready  ")).toMatchObject({
      ok: true,
      evaluation: { correct: true },
    });

    expect(
      evaluateActivity(
        {
          type: "short-answer",
          acceptedAnswers: ["café"],
          normalization: { locale: "pt-BR" },
        },
        "cafe",
      ),
    ).toMatchObject({ ok: true, evaluation: { correct: false } });
  });

  it("keeps word order and matching structurally deterministic", () => {
    expect(
      evaluateActivity(
        {
          type: "word-order",
          tokenIds: ["i", "am", "ready"],
          correctOrder: ["i", "am", "ready"],
        },
        ["i", "am", "ready"],
      ),
    ).toMatchObject({ ok: true, evaluation: { correct: true } });

    expect(
      evaluateActivity(
        { type: "matching", pairs: { hello: "ola", thanks: "obrigado" } },
        { hello: "obrigado", thanks: "ola" },
      ),
    ).toMatchObject({ ok: true, evaluation: { correct: false } });
  });

  it("rejects answer shapes that do not belong to the activity", () => {
    expect(
      evaluateActivity(
        {
          type: "fill-blank",
          acceptedAnswers: ["am"],
          normalization: { locale: "en" },
        },
        ["am"],
      ),
    ).toEqual({ ok: false, reason: "invalid-answer" });
  });

  it("evaluates every supported deterministic discriminator", () => {
    const cases: ReadonlyArray<
      readonly [DeterministicActivityDefinition, ActivityAnswer]
    > = [
      [
        { type: "single-choice", choiceIds: ["a", "b"], correctChoiceId: "a" },
        "a",
      ],
      [
        {
          type: "multiple-choice",
          choiceIds: ["a", "b"],
          correctChoiceIds: ["a", "b"],
        },
        ["a", "b"],
      ],
      [
        {
          type: "fill-blank",
          acceptedAnswers: ["hello"],
          normalization: { locale: "en" },
        },
        "hello",
      ],
      [
        { type: "word-order", tokenIds: ["a", "b"], correctOrder: ["a", "b"] },
        ["a", "b"],
      ],
      [{ type: "matching", pairs: { left: "right" } }, { left: "right" }],
      [
        {
          type: "short-answer",
          acceptedAnswers: ["hello"],
          normalization: { locale: "en" },
        },
        "hello",
      ],
      [
        {
          type: "translation",
          acceptedAnswers: ["hello"],
          normalization: { locale: "en" },
        },
        "hello",
      ],
    ];

    for (const [definition, answer] of cases) {
      const result = evaluateActivity(definition, answer);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.evaluation.correct).toBe(true);
    }
  });

  it("fails safely for an unknown activity discriminator", () => {
    const result = evaluateActivity({ type: "future-type" } as never, "answer");
    expect(result).toEqual({ ok: false, reason: "unsupported-activity" });
  });
});
