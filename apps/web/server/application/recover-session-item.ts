import type {
  Clock,
  LearnerJourney,
  SessionExecutionRepository,
  SessionRecoveryReason,
  StudyRepository,
} from "../../../../packages/domain/src/index.ts";
import type { CurriculumCatalog } from "../../../../packages/content/src/index.ts";
import type { TelemetryHooks } from "../observability/contracts";
import { getPracticeActivity } from "../practice/activity-catalog";

export type RecoverSessionItemResult =
  | Readonly<{
      ok: true;
      reason: SessionRecoveryReason | null;
      duplicate: boolean;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid-input"
        | "not-found"
        | "invalid-state"
        | "not-recoverable";
    }>;

export interface RecoverSessionItemDependencies {
  readonly clock: Clock;
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
  readonly execution: SessionExecutionRepository;
  readonly telemetry: TelemetryHooks;
}

function isSafeIdentifier(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

async function recoveryReason(
  dependencies: RecoverSessionItemDependencies,
  journey: LearnerJourney,
  item: NonNullable<
    Awaited<ReturnType<StudyRepository["findSessionItem"]>>
  >,
  now: Date,
): Promise<SessionRecoveryReason | null> {
  if (item.kind === "lesson") {
    const lesson = dependencies.catalog.lessonById.get(item.resourceId);
    if (!lesson || lesson.status !== "published" || lesson.blocks.length === 0) {
      return "content-unavailable";
    }
    if (
      lesson.schemaVersion !== item.schemaVersion ||
      lesson.revision !== item.revision
    ) {
      return "revision-conflict";
    }
    return null;
  }

  const memory = await dependencies.execution.findReviewResource(
    journey.enrollment.id,
    item.resourceId,
  );
  if (!memory) return "content-unavailable";
  const activity = getPracticeActivity(
    dependencies.catalog,
    memory.sourceActivityId,
  );
  if (!activity) return "content-unavailable";
  if (
    activity.content.schemaVersion !== item.schemaVersion ||
    activity.content.revision !== item.revision
  ) {
    return "revision-conflict";
  }
  if (memory.dueAt.getTime() > now.getTime()) {
    return "review-no-longer-due";
  }
  return null;
}

export function createRecoverSessionItem(
  dependencies: RecoverSessionItemDependencies,
) {
  return async function execute(input: {
    readonly journey: LearnerJourney;
    readonly sessionId: string;
    readonly itemId: string;
  }): Promise<RecoverSessionItemResult> {
    if (!isSafeIdentifier(input.sessionId) || !isSafeIdentifier(input.itemId)) {
      return { ok: false, reason: "invalid-input" };
    }

    const session = await dependencies.study.findSession(
      input.journey.enrollment.id,
      input.sessionId,
    );
    const item = await dependencies.study.findSessionItem(
      input.journey.enrollment.id,
      input.itemId,
    );
    if (!session || !item || item.studySessionId !== session.id) {
      return { ok: false, reason: "not-found" };
    }
    if (item.status === "skipped") {
      return { ok: true, reason: null, duplicate: true };
    }
    if (
      item.status === "completed" ||
      session.status === "completed" ||
      session.status === "abandoned"
    ) {
      return { ok: false, reason: "invalid-state" };
    }

    const now = dependencies.clock.now();
    const reason = await recoveryReason(
      dependencies,
      input.journey,
      item,
      now,
    );
    if (!reason) return { ok: false, reason: "not-recoverable" };

    const result = await dependencies.execution.skipSessionItem({
      enrollmentId: input.journey.enrollment.id,
      sessionId: input.sessionId,
      itemId: input.itemId,
      now,
    });
    if (!result.ok) return result;

    if (!result.duplicate) {
      dependencies.telemetry.recordMetric({
        name: "study.session.failure_reason",
        value: 1,
        unit: "count",
        attributes: { reason, itemKind: item.kind },
      });
    }
    return { ok: true, reason, duplicate: result.duplicate };
  };
}
