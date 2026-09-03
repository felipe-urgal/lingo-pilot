export type LessonProgressStatus = "in_progress" | "completed";
export type StudySessionStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "abandoned";
export type SessionItemStatus = "planned" | "in_progress" | "completed";
export type SessionItemKind = "lesson";
export type SessionReasonCode =
  | "NEW_ELIGIBLE_LESSON"
  | "RESUME_IN_PROGRESS";
export type StoredEligibilityReason =
  | "progress-satisfied"
  | "placement-waived"
  | "resume-in-progress";

export interface ContentRevisionRef {
  readonly schemaVersion: number;
  readonly revision: number;
}

export interface LessonProgress extends ContentRevisionRef {
  readonly enrollmentId: string;
  readonly lessonId: string;
  readonly status: LessonProgressStatus;
  readonly currentBlockIndex: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;
}

export interface SessionItem extends ContentRevisionRef {
  readonly id: string;
  readonly studySessionId: string;
  readonly position: number;
  readonly kind: SessionItemKind;
  readonly resourceId: string;
  readonly reasonCode: SessionReasonCode;
  readonly eligibilityReason: StoredEligibilityReason;
  readonly estimatedMinutes: number;
  readonly status: SessionItemStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StudySession {
  readonly id: string;
  readonly enrollmentId: string;
  readonly localStudyDate: string;
  readonly plannerVersion: string;
  readonly status: StudySessionStatus;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;
  readonly items: readonly SessionItem[];
}
