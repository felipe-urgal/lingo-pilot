export const evalDimensions = [
  "correctness",
  "pedagogical_fit",
  "level_adherence",
  "safety_privacy",
  "latency_cost",
] as const;

export type EvalDimension = (typeof evalDimensions)[number];
export type EvalSeverity = "critical" | "warning";

export type EvalCase<TInput> = Readonly<{
  id: string;
  input: TInput;
  tags?: readonly string[];
  humanReview?: Readonly<{
    rubricId: string;
    reason: string;
  }>;
}>;

export type EvalDataset<TInput> = Readonly<{
  id: string;
  version: string;
  feature: string;
  cases: readonly EvalCase<TInput>[];
}>;

export type EvalExecutionMetadata = Readonly<{
  provider?: string;
  model?: string;
  promptId?: string;
  promptVersion?: string;
  schemaVersion?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
}>;

export type EvalExecution<TOutput> = Readonly<{
  output: TOutput;
  metadata?: EvalExecutionMetadata;
}>;

export type EvalScorerResult = Readonly<{
  score: number;
  message?: string;
}>;

export type EvalScorerContext<TInput, TOutput> = Readonly<{
  evalCase: EvalCase<TInput>;
  execution: EvalExecution<TOutput>;
}>;

export type EvalScorer<TInput, TOutput> = Readonly<{
  id: string;
  dimension: EvalDimension;
  severity: EvalSeverity;
  appliesTo?: (evalCase: EvalCase<TInput>) => boolean;
  score: (
    context: EvalScorerContext<TInput, TOutput>,
  ) => EvalScorerResult | Promise<EvalScorerResult>;
}>;

export type EvalThresholds = Readonly<Partial<Record<EvalDimension, number>>>;

export type EvalCheckReport = Readonly<{
  scorerId: string;
  dimension: EvalDimension;
  severity: EvalSeverity;
  score: number;
  passed: boolean;
  message?: string;
}>;

export type EvalCaseReport = Readonly<{
  caseId: string;
  checks: readonly EvalCheckReport[];
  humanReview?: Readonly<{
    rubricId: string;
    reason: string;
  }>;
  metadata?: EvalExecutionMetadata;
}>;

export type EvalDimensionReport = Readonly<{
  dimension: EvalDimension;
  score: number;
  checks: number;
}>;

export type EvalReport = Readonly<{
  dataset: Readonly<{
    id: string;
    version: string;
    feature: string;
  }>;
  status: "passed" | "failed" | "needs_review";
  criticalFailures: number;
  warningFailures: number;
  dimensions: readonly EvalDimensionReport[];
  cases: readonly EvalCaseReport[];
}>;

export type EvalRunOptions<TInput, TOutput> = Readonly<{
  dataset: EvalDataset<TInput>;
  execute: (evalCase: EvalCase<TInput>) => Promise<EvalExecution<TOutput>>;
  scorers: readonly EvalScorer<TInput, TOutput>[];
  thresholds?: EvalThresholds;
}>;

export async function runEvalDataset<TInput, TOutput>(
  options: EvalRunOptions<TInput, TOutput>,
): Promise<EvalReport> {
  validateDataset(options.dataset);
  validateThresholds(options.thresholds);

  const cases: EvalCaseReport[] = [];

  for (const evalCase of options.dataset.cases) {
    const execution = await options.execute(evalCase);
    const checks: EvalCheckReport[] = [];

    for (const scorer of options.scorers) {
      if (scorer.appliesTo && !scorer.appliesTo(evalCase)) continue;

      const result = await scorer.score({ evalCase, execution });
      assertScore(result.score, `scorer ${scorer.id}`);

      checks.push({
        scorerId: scorer.id,
        dimension: scorer.dimension,
        severity: scorer.severity,
        score: result.score,
        passed: result.score >= 1,
        ...(result.message ? { message: result.message } : {}),
      });
    }

    cases.push({
      caseId: evalCase.id,
      checks,
      ...(evalCase.humanReview ? { humanReview: evalCase.humanReview } : {}),
      ...(execution.metadata ? { metadata: execution.metadata } : {}),
    });
  }

  const checks = cases.flatMap((item) => item.checks);
  const criticalFailures = checks.filter(
    (check) => check.severity === "critical" && !check.passed,
  ).length;
  const warningFailures = checks.filter(
    (check) => check.severity === "warning" && !check.passed,
  ).length;
  const dimensions = summarizeDimensions(checks);
  const thresholdsPass = dimensions.every((dimension) => {
    const threshold = options.thresholds?.[dimension.dimension];
    return threshold === undefined || dimension.score >= threshold;
  });
  const needsReview = cases.some((item) => item.humanReview !== undefined);

  return {
    dataset: {
      id: options.dataset.id,
      version: options.dataset.version,
      feature: options.dataset.feature,
    },
    status:
      criticalFailures > 0 || !thresholdsPass
        ? "failed"
        : needsReview
          ? "needs_review"
          : "passed",
    criticalFailures,
    warningFailures,
    dimensions,
    cases,
  };
}

function summarizeDimensions(
  checks: readonly EvalCheckReport[],
): EvalDimensionReport[] {
  return evalDimensions.flatMap((dimension) => {
    const matching = checks.filter((check) => check.dimension === dimension);
    if (matching.length === 0) return [];

    const score =
      matching.reduce((sum, check) => sum + check.score, 0) / matching.length;

    return [{ dimension, score, checks: matching.length }];
  });
}

function validateDataset<TInput>(dataset: EvalDataset<TInput>): void {
  if (!dataset.id.trim()) throw new Error("Eval dataset id is required");
  if (!dataset.version.trim())
    throw new Error("Eval dataset version is required");
  if (!dataset.feature.trim())
    throw new Error("Eval dataset feature is required");
  if (dataset.cases.length === 0) {
    throw new Error("Eval dataset must contain at least one case");
  }

  const ids = new Set<string>();
  for (const evalCase of dataset.cases) {
    if (!evalCase.id.trim()) throw new Error("Eval case id is required");
    if (ids.has(evalCase.id)) {
      throw new Error(`Duplicate eval case id: ${evalCase.id}`);
    }
    ids.add(evalCase.id);
  }
}

function validateThresholds(thresholds?: EvalThresholds): void {
  if (!thresholds) return;
  for (const [dimension, threshold] of Object.entries(thresholds)) {
    assertScore(threshold, `threshold ${dimension}`);
  }
}

function assertScore(score: number, subject: string): void {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error(`${subject} must return a score between 0 and 1`);
  }
}
