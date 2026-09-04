import type { StudySession } from "./study-session.ts";

export type SessionRecoveryReason =
  "content-unavailable" | "revision-conflict" | "review-no-longer-due";

export interface SessionReviewResource {
  readonly id: string;
  readonly sourceActivityId: string;
  readonly dueAt: Date;
}

export type SkipSessionItemResult =
  | Readonly<{ ok: true; session: StudySession; duplicate: boolean }>
  | Readonly<{ ok: false; reason: "not-found" | "invalid-state" }>;

export interface SessionExecutionRepository {
  findLatestOpenSession(enrollmentId: string): Promise<StudySession | null>;
  findReviewResource(
    enrollmentId: string,
    memoryItemId: string,
  ): Promise<SessionReviewResource | null>;
  skipSessionItem(input: {
    readonly enrollmentId: string;
    readonly sessionId: string;
    readonly itemId: string;
    readonly now: Date;
  }): Promise<SkipSessionItemResult>;
  finalizeSessionIfTerminal(input: {
    readonly enrollmentId: string;
    readonly sessionId: string;
    readonly now: Date;
  }): Promise<StudySession | null>;
  finalizeSessionContainingItem(input: {
    readonly enrollmentId: string;
    readonly itemId: string;
    readonly now: Date;
  }): Promise<StudySession | null>;
}
