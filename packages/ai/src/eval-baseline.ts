import type {
  EvalCaseReport,
  EvalCheckReport,
  EvalDimension,
  EvalReport,
} from "./eval-harness.js";

export const evalBaselineSchemaVersion = 1 as const;

export type EvalBaselineCheck = Readonly<{
  caseId: string;
  scorerId: string;
  dimension: EvalDimension;
  severity: EvalCheckReport["severity"];
  score: number;
}>;

export type EvalBaseline = Readonly<{
  schemaVersion: typeof evalBaselineSchemaVersion;
  dataset: EvalReport["dataset"];
  dimensions: Readonly<Partial<Record<EvalDimension, number>>>;
  checks: readonly EvalBaselineCheck[];
}>;

export type EvalRegression = Readonly<{
  kind:
    | "dataset_mismatch"
    | "report_failed"
    | "missing_check"
    | "check_score"
    | "dimension_score";
  severity: "critical" | "warning";
  message: string;
  caseId?: string;
  scorerId?: string;
  dimension?: EvalDimension;
  baselineScore?: number;
  currentScore?: number;
}>;

export type EvalBaselineComparison = Readonly<{
  status: "passed" | "regressed";
  regressions: readonly EvalRegression[];
}>;

/**
 * Creates a redacted baseline from a report. The report contract already omits
 * raw eval inputs and model outputs, so the baseline stores only scores and
 * stable identifiers needed for later comparison.
 */
export function createEvalBaseline(report: EvalReport): EvalBaseline {
  return {
    schemaVersion: evalBaselineSchemaVersion,
    dataset: report.dataset,
    dimensions: Object.fromEntries(
      report.dimensions.map((dimension) => [
        dimension.dimension,
        dimension.score,
      ]),
    ),
    checks: report.cases.flatMap((evalCase) =>
      evalCase.checks.map((check) => toBaselineCheck(evalCase, check)),
    ),
  };
}

export function compareEvalReportToBaseline(
  report: EvalReport,
  baseline: EvalBaseline,
): EvalBaselineComparison {
  const regressions: EvalRegression[] = [];

  if (!sameDataset(report, baseline)) {
    regressions.push({
      kind: "dataset_mismatch",
      severity: "critical",
      message: `Baseline ${baseline.dataset.id}@${baseline.dataset.version} does not match report ${report.dataset.id}@${report.dataset.version}`,
    });
    return { status: "regressed", regressions };
  }

  // Baseline comparison can never turn an already-failed eval run into a pass.
  // This also protects newly-added critical scorers/dimensions that were not
  // present when the baseline was created.
  if (report.status === "failed") {
    regressions.push({
      kind: "report_failed",
      severity: "critical",
      message: `Current eval report failed with ${report.criticalFailures} critical and ${report.warningFailures} warning failures`,
    });
  }

  const currentChecks = new Map(
    report.cases.flatMap((evalCase) =>
      evalCase.checks.map(
        (check) => [checkKey(evalCase.caseId, check.scorerId), check] as const,
      ),
    ),
  );

  for (const expected of baseline.checks) {
    const current = currentChecks.get(
      checkKey(expected.caseId, expected.scorerId),
    );
    if (!current) {
      regressions.push({
        kind: "missing_check",
        severity: expected.severity,
        caseId: expected.caseId,
        scorerId: expected.scorerId,
        dimension: expected.dimension,
        baselineScore: expected.score,
        message: `Missing baseline check ${expected.caseId}/${expected.scorerId}`,
      });
      continue;
    }

    if (current.score < expected.score) {
      regressions.push({
        kind: "check_score",
        severity: expected.severity,
        caseId: expected.caseId,
        scorerId: expected.scorerId,
        dimension: expected.dimension,
        baselineScore: expected.score,
        currentScore: current.score,
        message: `Check ${expected.caseId}/${expected.scorerId} regressed from ${expected.score} to ${current.score}`,
      });
    }
  }

  const currentDimensions = new Map(
    report.dimensions.map(
      (dimension) => [dimension.dimension, dimension.score] as const,
    ),
  );
  for (const [dimension, baselineScore] of Object.entries(
    baseline.dimensions,
  ) as Array<[EvalDimension, number]>) {
    const currentScore = currentDimensions.get(dimension);
    if (currentScore === undefined || currentScore < baselineScore) {
      regressions.push({
        kind: "dimension_score",
        severity: "warning",
        dimension,
        baselineScore,
        ...(currentScore === undefined ? {} : { currentScore }),
        message:
          currentScore === undefined
            ? `Dimension ${dimension} is missing from the current report`
            : `Dimension ${dimension} regressed from ${baselineScore} to ${currentScore}`,
      });
    }
  }

  return {
    status: regressions.length === 0 ? "passed" : "regressed",
    regressions,
  };
}

function toBaselineCheck(
  evalCase: EvalCaseReport,
  check: EvalCheckReport,
): EvalBaselineCheck {
  return {
    caseId: evalCase.caseId,
    scorerId: check.scorerId,
    dimension: check.dimension,
    severity: check.severity,
    score: check.score,
  };
}

function sameDataset(report: EvalReport, baseline: EvalBaseline): boolean {
  return (
    report.dataset.id === baseline.dataset.id &&
    report.dataset.version === baseline.dataset.version &&
    report.dataset.feature === baseline.dataset.feature
  );
}

function checkKey(caseId: string, scorerId: string): string {
  return `${caseId}\u0000${scorerId}`;
}
