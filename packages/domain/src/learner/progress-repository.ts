import type { MasteryState } from "./practice-learning.ts";
import type { LessonProgress, StudySession } from "./study-session.ts";

export interface ProgressMasterySummary {
  readonly conceptCount: number;
  readonly averageScorePercent: number | null;
  readonly averageConfidencePercent: number | null;
}

export interface ProgressSnapshot {
  readonly lessonProgress: readonly LessonProgress[];
  readonly mastery: ProgressMasterySummary;
  readonly weakConcepts: readonly MasteryState[];
  readonly dueReviewCount: number;
  readonly recentSessions: readonly StudySession[];
  readonly hasMoreSessions: boolean;
}

export interface LoadProgressSnapshotInput {
  readonly enrollmentId: string;
  readonly now: Date;
  readonly historyLimit: number;
  readonly historyOffset?: number;
  readonly weakConceptLimit?: number;
}

export interface ProgressRepository {
  loadProgressSnapshot(
    input: LoadProgressSnapshotInput,
  ): Promise<ProgressSnapshot>;
}
