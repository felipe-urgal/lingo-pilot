import { describe, expect, it } from "vitest";
import { MASTERY_ALGORITHM_VERSION, computeMastery } from "./mastery.ts";

const now = new Date("2026-09-03T18:00:00.000Z");

describe("mastery model v1", () => {
  it("does not treat one guided recognition success as high mastery", () => {
    const result = computeMastery(
      [
        {
          kind: "guided",
          modality: "reading",
          outcome: "correct",
          supportLevel: 1,
          occurredAt: now,
        },
      ],
      now,
    );

    expect(result.algorithmVersion).toBe(MASTERY_ALGORITHM_VERSION);
    expect(result.scorePercent).toBeLessThan(65);
    expect(result.confidencePercent).toBeLessThan(25);
  });

  it("weights delayed independent retrieval above immediate guided work", () => {
    const guided = computeMastery(
      [
        {
          kind: "guided",
          modality: "reading",
          outcome: "correct",
          supportLevel: 1,
          occurredAt: now,
        },
      ],
      now,
    );
    const delayed = computeMastery(
      [
        {
          kind: "delayed-review",
          modality: "writing",
          outcome: "correct",
          supportLevel: 0,
          occurredAt: now,
        },
      ],
      now,
    );

    expect(delayed.scorePercent).toBeGreaterThan(guided.scorePercent);
    expect(delayed.confidencePercent).toBeGreaterThan(guided.confidencePercent);
  });

  it("lets a recent independent error reduce the projection", () => {
    const earlier = new Date("2026-08-25T18:00:00.000Z");
    const beforeError = computeMastery(
      [
        {
          kind: "delayed-review",
          modality: "writing",
          outcome: "correct",
          supportLevel: 0,
          occurredAt: earlier,
        },
        {
          kind: "independent-retrieval",
          modality: "writing",
          outcome: "correct",
          supportLevel: 0,
          occurredAt: earlier,
        },
      ],
      now,
    );
    const afterError = computeMastery(
      [
        {
          kind: "delayed-review",
          modality: "writing",
          outcome: "correct",
          supportLevel: 0,
          occurredAt: earlier,
        },
        {
          kind: "independent-retrieval",
          modality: "writing",
          outcome: "correct",
          supportLevel: 0,
          occurredAt: earlier,
        },
        {
          kind: "independent-retrieval",
          modality: "writing",
          outcome: "incorrect",
          supportLevel: 0,
          occurredAt: now,
        },
      ],
      now,
    );

    expect(afterError.scorePercent).toBeLessThan(beforeError.scorePercent);
    expect(afterError.confidencePercent).toBeGreaterThan(
      beforeError.confidencePercent,
    );
  });

  it("is fully recomputable from the evidence sequence", () => {
    const evidence = [
      {
        kind: "guided" as const,
        modality: "mixed" as const,
        outcome: "incorrect" as const,
        supportLevel: 2,
        occurredAt: now,
      },
      {
        kind: "delayed-review" as const,
        modality: "speaking" as const,
        outcome: "correct" as const,
        supportLevel: 0,
        occurredAt: now,
      },
    ];

    expect(computeMastery(evidence, now)).toEqual(computeMastery(evidence, now));
  });
});
