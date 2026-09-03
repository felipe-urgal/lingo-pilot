import type {
  ActivityAttempt,
  ConceptEvidence,
  EvidenceKind,
  EvidenceModality,
  MasteryState,
  MemoryItem,
  PersistedActivityAnswer,
  ReviewEvent,
  ReviewGrade,
} from "./practice-learning.ts";

export interface MasteryProjection {
  readonly scorePercent: number;
  readonly confidencePercent: number;
  readonly algorithmVersion: string;
}

export type MasteryReducer = (
  evidence: readonly ConceptEvidence[],
) => MasteryProjection;

export interface InitialMemorySchedule {
  readonly conceptId: string;
  readonly memoryItemId: string;
  readonly dueAt: Date;
  readonly intervalSeconds: number;
  readonly algorithmVersion: string;
}

export interface SubmitAttemptInput {
  readonly attemptId: string;
  readonly enrollmentId: string;
  readonly sessionItemId: string | null;
  readonly activityId: string;
  readonly contentSchemaVersion: number;
  readonly contentRevision: number;
  readonly operationKey: string;
  readonly answer: PersistedActivityAnswer;
  readonly correct: boolean;
  readonly scorePercent: number;
  readonly hintCount: number;
  readonly modality: EvidenceModality;
  readonly supportLevel: number;
  readonly evidenceKind: EvidenceKind;
  readonly conceptIds: readonly string[];
  readonly initialMemorySchedules: readonly InitialMemorySchedule[];
  readonly now: Date;
}

export type SubmitAttemptResult =
  | Readonly<{ ok: true; attempt: ActivityAttempt; duplicate: boolean }>
  | Readonly<{ ok: false; reason: "not-found" }>;

export interface DueReviewItem extends MemoryItem {
  readonly mastery: MasteryState | null;
}

export interface RecordReviewInput {
  readonly reviewEventId: string;
  readonly enrollmentId: string;
  readonly memoryItemId: string;
  readonly operationKey: string;
  readonly expectedReviewCount: number;
  readonly grade: ReviewGrade;
  readonly correct: boolean;
  readonly hintCount: number;
  readonly nextDueAt: Date;
  readonly intervalSeconds: number;
  readonly algorithmVersion: string;
  readonly modality: EvidenceModality;
  readonly supportLevel: number;
  readonly now: Date;
}

export type RecordReviewResult =
  | Readonly<{ ok: true; event: ReviewEvent; duplicate: boolean }>
  | Readonly<{ ok: false; reason: "not-found" | "stale-review" }>;

export interface PracticeRepository {
  findAttemptByOperation(
    enrollmentId: string,
    operationKey: string,
  ): Promise<ActivityAttempt | null>;
  submitAttempt(
    input: SubmitAttemptInput,
    reduceMastery: MasteryReducer,
  ): Promise<SubmitAttemptResult>;
  listDueReviewItems(
    enrollmentId: string,
    now: Date,
    limit: number,
  ): Promise<readonly DueReviewItem[]>;
  findReviewByOperation(
    enrollmentId: string,
    operationKey: string,
  ): Promise<ReviewEvent | null>;
  recordReview(
    input: RecordReviewInput,
    reduceMastery: MasteryReducer,
  ): Promise<RecordReviewResult>;
  listConceptEvidence(
    enrollmentId: string,
    conceptId: string,
  ): Promise<readonly ConceptEvidence[]>;
  listWeakConcepts(
    enrollmentId: string,
    limit: number,
  ): Promise<readonly MasteryState[]>;
}
