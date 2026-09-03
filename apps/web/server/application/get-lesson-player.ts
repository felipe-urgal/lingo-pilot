import type {
  LearnerJourney,
  LessonProgress,
  StudyRepository,
  StudySession,
} from "../../../../packages/domain/src/index.ts";
import type {
  CurriculumCatalog,
  Lesson,
} from "../../../../packages/content/src/index.ts";

export type LessonPlayerLoadError =
  | "invalid-reference"
  | "content-unavailable"
  | "revision-conflict"
  | "not-started"
  | "completed"
  | "invalid-position";

export type LessonPlayerLoadResult =
  | Readonly<{
      ok: true;
      lesson: Lesson;
      progress: LessonProgress;
      session: StudySession;
      itemId: string;
      totalBlocks: number;
    }>
  | Readonly<{ ok: false; reason: LessonPlayerLoadError }>;

export interface GetLessonPlayerDependencies {
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
}

export interface GetLessonPlayerInput {
  readonly journey: LearnerJourney;
  readonly sessionId: string;
  readonly itemId: string;
  readonly lessonId: string;
}

function isSafeIdentifier(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export function createGetLessonPlayer(
  dependencies: GetLessonPlayerDependencies,
) {
  return async function execute(
    input: GetLessonPlayerInput,
  ): Promise<LessonPlayerLoadResult> {
    if (
      !isSafeIdentifier(input.sessionId) ||
      !isSafeIdentifier(input.itemId) ||
      !isSafeIdentifier(input.lessonId)
    ) {
      return { ok: false, reason: "invalid-reference" };
    }

    const session = await dependencies.study.findSession(
      input.journey.enrollment.id,
      input.sessionId,
    );
    const item = session?.items.find(
      (candidate) =>
        candidate.id === input.itemId &&
        candidate.resourceId === input.lessonId &&
        candidate.kind === "lesson",
    );
    if (!session || !item) {
      return { ok: false, reason: "invalid-reference" };
    }
    if (session.status === "completed" || item.status === "completed") {
      return { ok: false, reason: "completed" };
    }
    if (session.status === "abandoned") {
      return { ok: false, reason: "invalid-reference" };
    }

    const lesson = dependencies.catalog.lessonById.get(input.lessonId);
    if (!lesson || lesson.status !== "published" || lesson.blocks.length === 0) {
      return { ok: false, reason: "content-unavailable" };
    }
    if (
      item.schemaVersion !== lesson.schemaVersion ||
      item.revision !== lesson.revision
    ) {
      return { ok: false, reason: "revision-conflict" };
    }

    const progress = (
      await dependencies.study.listLessonProgress(input.journey.enrollment.id)
    ).find((candidate) => candidate.lessonId === input.lessonId);
    if (!progress) return { ok: false, reason: "not-started" };
    if (progress.status === "completed") {
      return { ok: false, reason: "completed" };
    }
    if (
      progress.schemaVersion !== lesson.schemaVersion ||
      progress.revision !== lesson.revision
    ) {
      return { ok: false, reason: "revision-conflict" };
    }
    if (
      progress.currentBlockIndex < 0 ||
      progress.currentBlockIndex >= lesson.blocks.length
    ) {
      return { ok: false, reason: "invalid-position" };
    }

    return {
      ok: true,
      lesson,
      progress,
      session,
      itemId: item.id,
      totalBlocks: lesson.blocks.length,
    };
  };
}
