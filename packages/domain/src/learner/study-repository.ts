import type {
  LessonProgress,
  SessionItem,
  StoredEligibilityReason,
  StudySession,
} from "./study-session.ts";

export interface EnsureDailySessionInput {
  readonly sessionId: string;
  readonly itemId: string;
  readonly enrollmentId: string;
  readonly localStudyDate: string;
  readonly plannerVersion: string;
  readonly lessonId: string;
  readonly contentSchemaVersion: number;
  readonly contentRevision: number;
  readonly estimatedMinutes: number;
  readonly eligibilityReason: StoredEligibilityReason;
  readonly now: Date;
}

export interface StartSessionItemInput {
  readonly enrollmentId: string;
  readonly sessionId: string;
  readonly itemId: string;
  readonly lessonId: string;
  readonly contentSchemaVersion: number;
  readonly contentRevision: number;
  readonly now: Date;
}

export interface SaveLessonPositionInput {
  readonly enrollmentId: string;
  readonly lessonId: string;
  readonly contentSchemaVersion: number;
  readonly contentRevision: number;
  readonly currentBlockIndex: number;
  readonly now: Date;
}

export interface CompleteLessonInput {
  readonly enrollmentId: string;
  readonly sessionId: string;
  readonly itemId: string;
  readonly lessonId: string;
  readonly contentSchemaVersion: number;
  readonly contentRevision: number;
  readonly now: Date;
}

export type StudyMutationFailure =
  | "not-found"
  | "invalid-state"
  | "revision-conflict";

export type StudyMutationResult<TValue> =
  | Readonly<{ ok: true; value: TValue }>
  | Readonly<{ ok: false; reason: StudyMutationFailure }>;

export interface StudyRepository {
  listLessonProgress(enrollmentId: string): Promise<readonly LessonProgress[]>;
  findDailySession(
    enrollmentId: string,
    localStudyDate: string,
  ): Promise<StudySession | null>;
  findSession(
    enrollmentId: string,
    sessionId: string,
  ): Promise<StudySession | null>;
  ensureDailySession(input: EnsureDailySessionInput): Promise<StudySession>;
  startSessionItem(
    input: StartSessionItemInput,
  ): Promise<StudyMutationResult<LessonProgress>>;
  saveLessonPosition(
    input: SaveLessonPositionInput,
  ): Promise<StudyMutationResult<LessonProgress>>;
  completeLesson(
    input: CompleteLessonInput,
  ): Promise<StudyMutationResult<StudySession>>;
  findSessionItem(
    enrollmentId: string,
    itemId: string,
  ): Promise<SessionItem | null>;
}
