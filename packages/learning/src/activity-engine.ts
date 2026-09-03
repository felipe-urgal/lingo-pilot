export const deterministicActivityTypes = [
  "single-choice",
  "multiple-choice",
  "fill-blank",
  "word-order",
  "matching",
  "short-answer",
  "translation",
] as const;
export type DeterministicActivityType =
  (typeof deterministicActivityTypes)[number];

export type TextNormalization = Readonly<{
  locale: string;
  caseSensitive?: boolean;
}>;

export type SingleChoiceDefinition = Readonly<{
  type: "single-choice";
  choiceIds: readonly string[];
  correctChoiceId: string;
}>;

export type MultipleChoiceDefinition = Readonly<{
  type: "multiple-choice";
  choiceIds: readonly string[];
  correctChoiceIds: readonly string[];
}>;

export type TextDefinition = Readonly<{
  type: "fill-blank" | "short-answer" | "translation";
  acceptedAnswers: readonly string[];
  normalization: TextNormalization;
}>;

export type WordOrderDefinition = Readonly<{
  type: "word-order";
  tokenIds: readonly string[];
  correctOrder: readonly string[];
}>;

export type MatchingDefinition = Readonly<{
  type: "matching";
  pairs: Readonly<Record<string, string>>;
}>;

export type DeterministicActivityDefinition =
  | SingleChoiceDefinition
  | MultipleChoiceDefinition
  | TextDefinition
  | WordOrderDefinition
  | MatchingDefinition;

export type ActivityAnswer =
  | string
  | readonly string[]
  | Readonly<Record<string, string>>;

export type ActivityEvaluation = Readonly<{
  source: "deterministic/rule";
  correct: boolean;
  scorePercent: number;
}>;

export type EvaluateActivityResult =
  | Readonly<{ ok: true; evaluation: ActivityEvaluation }>
  | Readonly<{
      ok: false;
      reason: "invalid-answer" | "unsupported-activity";
    }>;

function normalizeText(value: string, rules: TextNormalization): string {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  return rules.caseSensitive
    ? normalized
    : normalized.toLocaleLowerCase(rules.locale);
}

function hasExactMembers(
  received: readonly string[],
  expected: readonly string[],
): boolean {
  if (received.length !== expected.length) return false;
  if (new Set(received).size !== received.length) return false;
  const expectedSet = new Set(expected);
  return received.every((value) => expectedSet.has(value));
}

function exactSequence(
  received: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    received.length === expected.length &&
    received.every((value, index) => value === expected[index])
  );
}

function exactPairs(
  received: Readonly<Record<string, string>>,
  expected: Readonly<Record<string, string>>,
): boolean {
  const keys = Object.keys(expected);
  return (
    Object.keys(received).length === keys.length &&
    keys.every((key) => received[key] === expected[key])
  );
}

function evaluation(correct: boolean): EvaluateActivityResult {
  return {
    ok: true,
    evaluation: {
      source: "deterministic/rule",
      correct,
      scorePercent: correct ? 100 : 0,
    },
  };
}

export function evaluateActivity(
  definition: DeterministicActivityDefinition,
  answer: ActivityAnswer,
): EvaluateActivityResult {
  switch (definition.type) {
    case "single-choice":
      return typeof answer === "string"
        ? evaluation(answer === definition.correctChoiceId)
        : { ok: false, reason: "invalid-answer" };
    case "multiple-choice":
      return Array.isArray(answer)
        ? evaluation(hasExactMembers(answer, definition.correctChoiceIds))
        : { ok: false, reason: "invalid-answer" };
    case "fill-blank":
    case "short-answer":
    case "translation":
      if (typeof answer !== "string") {
        return { ok: false, reason: "invalid-answer" };
      }
      return evaluation(
        definition.acceptedAnswers.some(
          (candidate) =>
            normalizeText(candidate, definition.normalization) ===
            normalizeText(answer, definition.normalization),
        ),
      );
    case "word-order":
      return Array.isArray(answer)
        ? evaluation(exactSequence(answer, definition.correctOrder))
        : { ok: false, reason: "invalid-answer" };
    case "matching":
      if (
        typeof answer !== "object" ||
        answer === null ||
        Array.isArray(answer)
      ) {
        return { ok: false, reason: "invalid-answer" };
      }
      return evaluation(exactPairs(answer, definition.pairs));
    default:
      return { ok: false, reason: "unsupported-activity" };
  }
}
