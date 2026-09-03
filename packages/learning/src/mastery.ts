export const MASTERY_ALGORITHM_VERSION = "mastery-v1" as const;

export interface MasteryEvidence {
  readonly kind: "guided" | "independent-retrieval" | "delayed-review";
  readonly modality: "reading" | "listening" | "writing" | "speaking" | "mixed";
  readonly outcome: "correct" | "incorrect";
  readonly supportLevel: number;
  readonly occurredAt: Date;
}

export interface MasteryProjection {
  readonly scorePercent: number;
  readonly confidencePercent: number;
  readonly algorithmVersion: typeof MASTERY_ALGORITHM_VERSION;
}

const kindWeights: Readonly<Record<MasteryEvidence["kind"], number>> = {
  guided: 0.45,
  "independent-retrieval": 1,
  "delayed-review": 1.4,
};

const modalityWeights: Readonly<Record<MasteryEvidence["modality"], number>> = {
  reading: 0.9,
  listening: 1,
  writing: 1.15,
  speaking: 1.2,
  mixed: 1.1,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function supportMultiplier(supportLevel: number): number {
  return clamp(1 - Math.max(0, supportLevel) * 0.15, 0.4, 1);
}

function recentErrorMultiplier(evidence: MasteryEvidence, now: Date): number {
  if (evidence.outcome !== "incorrect") return 1;
  const ageDays = (now.getTime() - evidence.occurredAt.getTime()) / 86_400_000;
  return ageDays <= 7 ? 1.25 : 1;
}

function evidenceWeight(evidence: MasteryEvidence, now: Date): number {
  return (
    kindWeights[evidence.kind] *
    modalityWeights[evidence.modality] *
    supportMultiplier(evidence.supportLevel) *
    recentErrorMultiplier(evidence, now)
  );
}

export function computeMastery(
  evidence: readonly MasteryEvidence[],
  now: Date = evidence.at(-1)?.occurredAt ?? new Date(0),
): MasteryProjection {
  let positive = 0;
  let negative = 0;

  for (const item of evidence) {
    const weight = evidenceWeight(item, now);
    if (item.outcome === "correct") positive += weight;
    else negative += weight;
  }

  const total = positive + negative;
  const score = (1 + positive) / (2 + total);
  const confidence = clamp(total / 4, 0, 1);

  return {
    scorePercent: Math.round(clamp(score, 0, 1) * 100),
    confidencePercent: Math.round(confidence * 100),
    algorithmVersion: MASTERY_ALGORITHM_VERSION,
  };
}

export function isWeakConcept(projection: MasteryProjection): boolean {
  return projection.scorePercent < 60 && projection.confidencePercent >= 20;
}
