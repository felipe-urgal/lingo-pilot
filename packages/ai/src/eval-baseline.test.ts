import { describe, expect, it } from "vitest";
import {
  compareEvalReportToBaseline,
  createEvalBaseline,
  evalBaselineSchemaVersion,
} from "./eval-baseline.js";
import type { EvalReport } from "./eval-harness.js";

const baselineReport: EvalReport = {
  dataset: { id: "writing.a0", version: "1", feature: "writing" },
  status: "passed",
  criticalFailures: 0,
  warningFailures: 0,
  dimensions: [
    { dimension: "correctness", score: 1, checks: 1 },
    { dimension: "level_adherence", score: 1, checks: 1 },
  ],
  cases: [
    {
      caseId: "short-answer",
      checks: [
        {
          scorerId: "schema",
          dimension: "correctness",
          severity: "critical",
          score: 1,
          passed: true,
        },
        {
          scorerId: "level-ceiling",
          dimension: "level_adherence",
          severity: "critical",
          score: 1,
          passed: true,
        },
      ],
      metadata: {
        provider: "fake",
        model: "fixture",
        promptId: "writing.feedback",
        promptVersion: "1",
      },
    },
  ],
};

describe("AI eval baselines", () => {
  it("creates a redacted, versioned baseline from the report", () => {
    const baseline = createEvalBaseline(baselineReport);

    expect(baseline.schemaVersion).toBe(evalBaselineSchemaVersion);
    expect(baseline.dataset).toEqual(baselineReport.dataset);
    expect(baseline.checks).toEqual([
      {
        caseId: "short-answer",
        scorerId: "schema",
        dimension: "correctness",
        severity: "critical",
        score: 1,
      },
      {
        caseId: "short-answer",
        scorerId: "level-ceiling",
        dimension: "level_adherence",
        severity: "critical",
        score: 1,
      },
    ]);
    expect(JSON.stringify(baseline)).not.toContain("provider");
    expect(JSON.stringify(baseline)).not.toContain("promptId");
  });

  it("passes an unchanged report", () => {
    const comparison = compareEvalReportToBaseline(
      baselineReport,
      createEvalBaseline(baselineReport),
    );

    expect(comparison).toEqual({ status: "passed", regressions: [] });
  });

  it("reports a critical per-case regression even when another check still passes", () => {
    const current: EvalReport = {
      ...baselineReport,
      status: "failed",
      criticalFailures: 1,
      dimensions: [
        { dimension: "correctness", score: 1, checks: 1 },
        { dimension: "level_adherence", score: 0, checks: 1 },
      ],
      cases: [
        {
          ...baselineReport.cases[0]!,
          checks: [
            baselineReport.cases[0]!.checks[0]!,
            {
              ...baselineReport.cases[0]!.checks[1]!,
              score: 0,
              passed: false,
            },
          ],
        },
      ],
    };

    const comparison = compareEvalReportToBaseline(
      current,
      createEvalBaseline(baselineReport),
    );

    expect(comparison.status).toBe("regressed");
    expect(comparison.regressions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "report_failed",
          severity: "critical",
        }),
        expect.objectContaining({
          kind: "check_score",
          severity: "critical",
          caseId: "short-answer",
          scorerId: "level-ceiling",
          baselineScore: 1,
          currentScore: 0,
        }),
      ]),
    );
  });

  it("fails closed when a new critical scorer fails outside the baseline", () => {
    const current: EvalReport = {
      ...baselineReport,
      status: "failed",
      criticalFailures: 1,
      dimensions: [
        ...baselineReport.dimensions,
        { dimension: "safety_privacy", score: 0, checks: 1 },
      ],
      cases: [
        {
          ...baselineReport.cases[0]!,
          checks: [
            ...baselineReport.cases[0]!.checks,
            {
              scorerId: "new-privacy-guard",
              dimension: "safety_privacy",
              severity: "critical",
              score: 0,
              passed: false,
            },
          ],
        },
      ],
    };

    const comparison = compareEvalReportToBaseline(
      current,
      createEvalBaseline(baselineReport),
    );

    expect(comparison).toMatchObject({
      status: "regressed",
      regressions: [
        expect.objectContaining({
          kind: "report_failed",
          severity: "critical",
        }),
      ],
    });
  });

  it("fails closed when a baseline check disappears", () => {
    const current: EvalReport = {
      ...baselineReport,
      dimensions: [{ dimension: "correctness", score: 1, checks: 1 }],
      cases: [
        {
          ...baselineReport.cases[0]!,
          checks: [baselineReport.cases[0]!.checks[0]!],
        },
      ],
    };

    const comparison = compareEvalReportToBaseline(
      current,
      createEvalBaseline(baselineReport),
    );

    expect(comparison.status).toBe("regressed");
    expect(comparison.regressions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_check",
          severity: "critical",
          scorerId: "level-ceiling",
        }),
      ]),
    );
  });

  it("rejects comparison across dataset versions", () => {
    const comparison = compareEvalReportToBaseline(
      {
        ...baselineReport,
        dataset: { ...baselineReport.dataset, version: "2" },
      },
      createEvalBaseline(baselineReport),
    );

    expect(comparison).toMatchObject({
      status: "regressed",
      regressions: [
        expect.objectContaining({
          kind: "dataset_mismatch",
          severity: "critical",
        }),
      ],
    });
  });
});
