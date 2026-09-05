import type {
  EvalDimension,
  EvalScorer,
  EvalSeverity,
} from "./eval-harness.js";

export type ScorerIdentity = Readonly<{
  id: string;
  dimension: EvalDimension;
  severity?: EvalSeverity;
}>;

export function createMaxLengthScorer<TInput, TOutput>(
  identity: ScorerIdentity,
  maximum: number,
  select: (output: TOutput) => string,
): EvalScorer<TInput, TOutput> {
  if (!Number.isInteger(maximum) || maximum < 0) {
    throw new Error("Maximum length must be a non-negative integer");
  }

  return {
    ...identity,
    severity: identity.severity ?? "warning",
    score: ({ execution }) => {
      const value = select(execution.output);
      return value.length <= maximum
        ? { score: 1 }
        : {
            score: 0,
            message: `Selected text exceeds maximum length ${maximum}`,
          };
    },
  };
}

export function createAllowedIdsScorer<TInput, TOutput>(
  identity: ScorerIdentity,
  allowlist: ReadonlySet<string>,
  select: (output: TOutput) => readonly string[],
): EvalScorer<TInput, TOutput> {
  return {
    ...identity,
    severity: identity.severity ?? "critical",
    score: ({ execution }) => {
      const unexpected = select(execution.output).filter(
        (value) => !allowlist.has(value),
      );
      return unexpected.length === 0
        ? { score: 1 }
        : {
            score: 0,
            message: `Output contains ${unexpected.length} non-allowlisted id(s)`,
          };
    },
  };
}

export function createForbiddenSubstringScorer<TInput, TOutput>(
  identity: ScorerIdentity,
  forbidden: readonly string[],
  select: (output: TOutput) => string,
): EvalScorer<TInput, TOutput> {
  const normalized = forbidden.map((value) => value.toLocaleLowerCase());

  return {
    ...identity,
    severity: identity.severity ?? "critical",
    score: ({ execution }) => {
      const value = select(execution.output).toLocaleLowerCase();
      const found = normalized.some((candidate) => value.includes(candidate));
      return found
        ? { score: 0, message: "Output contains a forbidden substring" }
        : { score: 1 };
    },
  };
}

export function createSchemaVersionScorer<TInput, TOutput>(
  identity: ScorerIdentity,
  expectedVersion: string,
): EvalScorer<TInput, TOutput> {
  return {
    ...identity,
    severity: identity.severity ?? "critical",
    score: ({ execution }) =>
      execution.metadata?.schemaVersion === expectedVersion
        ? { score: 1 }
        : { score: 0, message: "Unexpected or missing schema version" },
  };
}
