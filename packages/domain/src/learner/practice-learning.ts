import type { ContentRevisionRef } from "./study-session.ts";

export const evaluationSources = ["deterministic/rule"] as const;
export type EvaluationSource = (typeof evaluationSources)[number];

export const evidenceKinds = [
  "guided",
  "independent-retrieval",
  "delayed-review",
] as const;
export type EvidenceKind = (typeof evidenceKinds)[number];

export const evidenceModalities = [
  "reading",
  "listening",
  "writing",
  "speaking",
  "mixed",
] as const;
export type EvidenceModality = (typeof evidenceModalities)[number];

export const reviewGrades = ["again", "hard", "good", "easy"] as const;
export type ReviewGrade = (typeof reviewGrades)[number];

export type PersistedActivityAnswer =
  | string
  | readonly string[]
  | Readonly<Record<string, string>>;

export interface AttemptEvaluation {
  readonly source: EvaluationSource;
  readonly correct: boolean;
  readonly scorePercent: number;
}

export interface ActivityAttempt extends ContentRevisionRef {
  readonly id: string;
  readonly enrollmentId: string;
  readonly sessionItemId: string | null;
  readonly activityId: string;
  readonly operationKey: string;
  readonly answer: PersistedActivityAnswer;
  readonly evaluation: AttemptEvaluation;
  readonly hintCount: number;
  readonly modality: EvidenceModality;
  readonly createdAt: Date;
}

export interface ActivityProgress {
  readonly enrollmentId: string;
  readonly activityId: string;
  readonly attempts: number;
  readonly correctAttempts: number;
  readonly lastAttemptAt: Date;
}

export interface MemoryItem {
  readonly id: string;
  readonly enrollmentId: string;
  readonly conceptId: string;
  readonly sourceActivityId: string;
  readonly dueAt: Date;
  readonly intervalSeconds: number;
  readonly reviewCount: number;
  readonly algorithmVersion: string;
  readonly updatedAt: Date;
}

export interface ReviewEvent {
  readonly id: string;
  readonly memoryItemId: string;
  readonly enrollmentId: string;
  readonly operationKey: string;
  readonly grade: ReviewGrade;
  readonly correct: boolean;
  readonly hintCount: number;
  readonly previousDueAt: Date;
  readonly nextDueAt: Date;
  readonly intervalSeconds: number;
  readonly algorithmVersion: string;
  readonly createdAt: Date;
}

export interface ConceptEvidence {
  readonly id: string;
  readonly enrollmentId: string;
  readonly conceptId: string;
  readonly sourceType: "attempt" | "review";
  readonly sourceId: string;
  readonly kind: EvidenceKind;
  readonly modality: EvidenceModality;
  readonly outcome: "correct" | "incorrect";
  readonly supportLevel: number;
  readonly occurredAt: Date;
}

export interface MasteryState {
  readonly enrollmentId: string;
  readonly conceptId: string;
  readonly scorePercent: number;
  readonly confidencePercent: number;
  readonly algorithmVersion: string;
  readonly updatedAt: Date;
}
