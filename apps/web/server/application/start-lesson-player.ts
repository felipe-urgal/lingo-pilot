import type {
  Clock,
  LearnerJourney,
  LessonProgress,
  StudyRepository,
} from "../../../../packages/domain/src/index.ts";
import type {
  CurriculumCatalog,
  Lesson,
} from "../../../../packages/content/src/index.ts";
import {
  canStartLesson,
  evaluateCurriculum,
} from "../../../../packages/learning/src/index.ts";

export type StartLessonPlayerError =
  | "invalid-reference"
  | "content-unavailable"
  | "revision-conflict"
  | "lesson-locked"
  | "invalid-state";

export type StartLessonPlayerResult =
  | Readonly<{ ok: true; lesson: Lesson; progress: LessonProgress }>
  | Readonly<{ ok: false; reason: StartLessonPlayerError }>;

export interface StartLessonPlayerDependencies {
  readonly clock: Clock;
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
}

export interface StartLessonPlayerInput {
  readonly journey: LearnerJourney;
  readonly sessionId: string;
  readonly itemId: string;
}

function isSafeIdentifier(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export function createStartLessonPlayer(
  dependencies: StartLessonPlayerDependencies,
) {
  return async function execute(
    input: StartLessonPlayerInput,
  ): Promise<StartLessonPlayerResult> {
    if (!isSafeIdentifier(input.sessionId) || !isSafeIdentifier(input.itemId)) {
      return { ok: false, reason: "invalid-reference" };
    }

    const session = await dependencies.study.findSession(
      input.journey.enrollment.id,
      input.sessionId,
    );
    const item = session?.items.find((candidate) => candidate.id === input.itemId);
    if (!session || !item || item.kind !== "lesson") {
      return { ok: false, reason: "invalid-reference" };
    }
    if (session.status === "completed" || session.status === "abandoned") {
      return { ok: false, reason: "invalid-state" };
    }

    const lesson = dependencies.catalog.lessonById.get(item.resourceId);
    if (!lesson || lesson.status !== "published" || lesson.blocks.length === 0) {
      return { ok: false, reason: "content-unavailable" };
    }
    if (
      item.schemaVersion !== lesson.schemaVersion ||
      item.revision !== lesson.revision
    ) {
      return { ok: false, reason: "revision-conflict" };
    }

    const progress = await dependencies.study.listLessonProgress(
      input.journey.enrollment.id,
    );
    const eligibility = evaluateCurriculum({
      catalog: dependencies.catalog,
      entryPointLevel: input.journey.enrollment.entryPointLevel,
      enrollmentStatus: input.journey.enrollment.status,
      progress,
    });
    if (!canStartLesson(eligibility, lesson.id)) {
      return { ok: false, reason: "lesson-locked" };
    }

    const started = await dependencies.study.startSessionItem({
      enrollmentId: input.journey.enrollment.id,
      sessionId: session.id,
      itemId: item.id,
      lessonId: lesson.id,
      contentSchemaVersion: lesson.schemaVersion,
      contentRevision: lesson.revision,
      now: dependencies.clock.now(),
    });
    if (!started.ok) {
      if (started.reason === "revision-conflict") {
        return { ok: false, reason: "revision-conflict" };
      }
      if (started.reason === "not-found") {
        return { ok: false, reason: "invalid-reference" };
      }
      return { ok: false, reason: "invalid-state" };
    }

    return { ok: true, lesson, progress: started.value };
  };
}
