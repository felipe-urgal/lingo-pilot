import { describe, expect, it } from "vitest";
import { FakeLanguageModelProvider } from "./fake-provider.js";
import {
  runEvalDataset,
  type EvalDataset,
  type EvalExecution,
} from "./eval-harness.js";
import {
  createAllowedIdsScorer,
  createForbiddenSubstringScorer,
  createMaxLengthScorer,
  createSchemaVersionScorer,
} from "./eval-scorers.js";
import type { StructuredOutputContract } from "./contracts.js";

type Output = Readonly<{
  feedback: string;
  conceptIds: readonly string[];
}>;

type Input = Readonly<{
  privateText: string;
}>;

const outputContract: StructuredOutputContract<Output> = {
  name: "eval_fixture_v1",
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["feedback", "conceptIds"],
    properties: {
      feedback: { type: "string" },
      conceptIds: { type: "array", items: { type: "string" } },
    },
  },
  parse(value) {
    if (!value || typeof value !== "object") throw new Error("invalid output");
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.feedback !== "string")
      throw new Error("invalid feedback");
    if (
      !Array.isArray(candidate.conceptIds) ||
      !candidate.conceptIds.every((item) => typeof item === "string")
    ) {
      throw new Error("invalid concept ids");
    }
    return {
      feedback: candidate.feedback,
      conceptIds: candidate.conceptIds,
    };
  },
};

const dataset: EvalDataset<Input> = {
  id: "fixture.writing",
  version: "1",
  feature: "writing",
  cases: [
    {
      id: "a0-short-feedback",
      input: { privateText: "PRIVATE_INPUT_MUST_NOT_ENTER_REPORT" },
      tags: ["a0"],
    },
  ],
};

function createExecutor(
  response: Output,
): (
  evalCase: (typeof dataset.cases)[number],
) => Promise<EvalExecution<Output>> {
  const provider = new FakeLanguageModelProvider({
    structuredResponses: [response],
    model: "fake-eval-model",
  });

  return async (evalCase) => {
    const result = await provider.generateStructured({
      prompt: {
        id: "eval.fixture",
        version: "1",
        instructions: "Return the scripted fixture.",
      },
      input: evalCase.input.privateText,
      output: outputContract,
    });

    return {
      output: result.value,
      metadata: {
        provider: result.metadata.provider,
        model: result.metadata.model,
        promptId: result.metadata.prompt.id,
        promptVersion: result.metadata.prompt.version,
        schemaVersion: "eval-output-v1",
        latencyMs: result.metadata.latencyMs,
      },
    };
  };
}

const scorers = [
  createAllowedIdsScorer<Input, Output>(
    {
      id: "concept-allowlist",
      dimension: "level_adherence",
      severity: "critical",
    },
    new Set(["concept.a0.be"]),
    (output) => output.conceptIds,
  ),
  createMaxLengthScorer<Input, Output>(
    { id: "feedback-length", dimension: "pedagogical_fit" },
    80,
    (output) => output.feedback,
  ),
  createForbiddenSubstringScorer<Input, Output>(
    {
      id: "privacy-copy",
      dimension: "safety_privacy",
      severity: "critical",
    },
    ["PRIVATE_INPUT_MUST_NOT_ENTER_REPORT"],
    (output) => output.feedback,
  ),
  createSchemaVersionScorer<Input, Output>(
    {
      id: "schema-version",
      dimension: "correctness",
      severity: "critical",
    },
    "eval-output-v1",
  ),
];

describe("AI eval harness", () => {
  it("runs deterministic offline fixtures without exposing raw input or output", async () => {
    const report = await runEvalDataset({
      dataset,
      execute: createExecutor({
        feedback: "Revise only the most important A0 error.",
        conceptIds: ["concept.a0.be"],
      }),
      scorers,
      thresholds: {
        pedagogical_fit: 1,
        level_adherence: 1,
        safety_privacy: 1,
      },
    });

    expect(report.status).toBe("passed");
    expect(report.criticalFailures).toBe(0);
    expect(report.cases[0]?.metadata).toMatchObject({
      provider: "fake",
      model: "fake-eval-model",
      promptId: "eval.fixture",
      promptVersion: "1",
      schemaVersion: "eval-output-v1",
    });
    expect(JSON.stringify(report)).not.toContain(
      "PRIVATE_INPUT_MUST_NOT_ENTER_REPORT",
    );
    expect(JSON.stringify(report)).not.toContain(
      "Revise only the most important A0 error.",
    );
  });

  it("fails closed when one critical property fails even if other dimensions pass", async () => {
    const report = await runEvalDataset({
      dataset,
      execute: createExecutor({
        feedback: "Short feedback.",
        conceptIds: ["concept.a2.locked"],
      }),
      scorers,
    });

    expect(report.status).toBe("failed");
    expect(report.criticalFailures).toBe(1);
    expect(
      report.cases[0]?.checks.find(
        (check) => check.scorerId === "concept-allowlist",
      ),
    ).toMatchObject({ passed: false, severity: "critical" });
  });

  it("keeps explicit human review as a first-class pending state", async () => {
    const reviewDataset: EvalDataset<Input> = {
      ...dataset,
      cases: [
        {
          ...dataset.cases[0]!,
          humanReview: {
            rubricId: "naturalness-v1",
            reason: "Naturalness is not reduced to a deterministic heuristic.",
          },
        },
      ],
    };

    const report = await runEvalDataset({
      dataset: reviewDataset,
      execute: createExecutor({
        feedback: "Short feedback.",
        conceptIds: ["concept.a0.be"],
      }),
      scorers,
    });

    expect(report.status).toBe("needs_review");
    expect(report.cases[0]?.humanReview?.rubricId).toBe("naturalness-v1");
  });

  it("rejects duplicate case ids before executing the dataset", async () => {
    const duplicateDataset: EvalDataset<Input> = {
      ...dataset,
      cases: [dataset.cases[0]!, dataset.cases[0]!],
    };

    await expect(
      runEvalDataset({
        dataset: duplicateDataset,
        execute: createExecutor({ feedback: "unused", conceptIds: [] }),
        scorers,
      }),
    ).rejects.toThrow("Duplicate eval case id");
  });
});
