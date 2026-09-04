import type {
  Clock,
  LearnerJourney,
  SessionExecutionRepository,
  StudyRepository,
} from "../../../../packages/domain/src/index.ts";
import type { CurriculumCatalog } from "../../../../packages/content/src/index.ts";
import {
  createGetLessonPlayer,
  type LessonPlayerLoadError,
} from "./get-lesson-player.ts";

export type LessonPlayerAction = "back" | "next" | "complete";
export type NavigateLessonPlayerError =
  LessonPlayerLoadError | "invalid-action" | "invalid-state";

export type NavigateLessonPlayerResult =
  | Readonly<{
      ok: true;
      completed: boolean;
      currentBlockIndex: number;
    }>
  | Readonly<{ ok: false; reason: NavigateLessonPlayerError }>;

export interface NavigateLessonPlayerDependencies {
  readonly clock: Clock;
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
  readonly execution: SessionExecutionRepository;
}

export interface NavigateLessonPlayerInput {
  readonly journey: LearnerJourney;
  readonly sessionId: string;
  readonly itemId: string;
  readonly lessonId: string;
  readonly action: unknown;
  readonly expectedBlockIndex: unknown;
}

function parseAction(value: unknown): LessonPlayerAction | null {
  return value === "back" || value === "next" || value === "complete"
    ? value
    : null;
}

function parseBlockIndex(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function createNavigateLessonPlayer(
  dependencies: NavigateLessonPlayerDependencies,
) {
  const getLessonPlayer = createGetLessonPlayer(dependencies);

  return async function execute(
    input: NavigateLessonPlayerInput,
  ): Promise<NavigateLessonPlayerResult> {
    const action = parseAction(input.action);
    const expectedBlockIndex = parseBlockIndex(input.expectedBlockIndex);
    if (!action || expectedBlockIndex === null) {
      return { ok: false, reason: "invalid-action" };
    }

    const loaded = await getLessonPlayer({
      journey: input.journey,
      sessionId: input.sessionId,
      itemId: input.itemId,
      lessonId: input.lessonId,
    });
    if (!loaded.ok) return loaded;

    const current = loaded.progress.currentBlockIndex;
    if (current !== expectedBlockIndex) {
      return { ok: false, reason: "invalid-state" };
    }

    if (action === "complete") {
      if (current !== loaded.totalBlocks - 1) {
        return { ok: false, reason: "invalid-state" };
      }
      const now = dependencies.clock.now();
      const completed = await dependencies.study.completeLesson({
        enrollmentId: input.journey.enrollment.id,
        sessionId: loaded.session.id,
        itemId: loaded.itemId,
        lessonId: loaded.lesson.id,
        contentSchemaVersion: loaded.lesson.schemaVersion,
        contentRevision: loaded.lesson.revision,
        now,
      });
      if (!completed.ok) {
        return {
          ok: false,
          reason:
            completed.reason === "revision-conflict"
              ? "revision-conflict"
              : "invalid-state",
        };
      }
      await dependencies.execution.finalizeSessionIfTerminal({
        enrollmentId: input.journey.enrollment.id,
        sessionId: loaded.session.id,
        now,
      });
      return { ok: true, completed: true, currentBlockIndex: current };
    }

    if (action === "back" && current === 0) {
      return { ok: true, completed: false, currentBlockIndex: current };
    }
    if (action === "next" && current >= loaded.totalBlocks - 1) {
      return { ok: false, reason: "invalid-state" };
    }

    const nextIndex = action === "back" ? current - 1 : current + 1;
    const saved = await dependencies.study.saveLessonPosition({
      enrollmentId: input.journey.enrollment.id,
      lessonId: loaded.lesson.id,
      contentSchemaVersion: loaded.lesson.schemaVersion,
      contentRevision: loaded.lesson.revision,
      expectedBlockIndex: current,
      currentBlockIndex: nextIndex,
      now: dependencies.clock.now(),
    });
    if (!saved.ok) {
      return {
        ok: false,
        reason:
          saved.reason === "revision-conflict"
            ? "revision-conflict"
            : "invalid-state",
      };
    }

    return {
      ok: true,
      completed: false,
      currentBlockIndex: saved.value.currentBlockIndex,
    };
  };
}
