import type {
  Clock,
  IdGenerator,
  LearnerJourney,
  PracticeRepository,
  SessionExecutionRepository,
  StudyRepository,
  StudySession,
} from "../../../../packages/domain/src/index.ts";
import type {
  CurriculumCatalog,
  Lesson,
} from "../../../../packages/content/src/index.ts";
import {
  DAILY_SESSION_PLANNER_VERSION,
  evaluateCurriculum,
  localStudyDate,
  planDailySession,
  type LessonEligibility,
  type PlannerLessonCandidate,
  type PlannerModality,
  type PlannerReviewCandidate,
} from "../../../../packages/learning/src/index.ts";
import type { TelemetryHooks } from "../observability/contracts";
import { getPracticeActivity } from "../practice/activity-catalog";

const MAX_PLANNER_REVIEWS = 100;
const MAX_WEAK_CONCEPTS = 100;

export type TodayStudy = Readonly<{
  localStudyDate: string;
  eligibility: readonly LessonEligibility[];
  session: StudySession | null;
  lesson: Lesson | null;
}>;

export interface GetTodayStudyDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
  readonly practice: PracticeRepository;
  readonly execution: SessionExecutionRepository;
  readonly availableModalities: readonly PlannerModality[];
  readonly telemetry: TelemetryHooks;
}

function lessonForSession(
  catalog: CurriculumCatalog,
  session: StudySession,
): Lesson | null {
  const item =
    session.items.find(
      (candidate) =>
        candidate.kind === "lesson" &&
        (candidate.status === "planned" || candidate.status === "in_progress"),
    ) ?? session.items.find((candidate) => candidate.kind === "lesson");
  if (!item) return null;
  const lesson = catalog.lessonById.get(item.resourceId);
  if (!lesson || lesson.status !== "published") return null;
  if (
    lesson.schemaVersion !== item.schemaVersion ||
    lesson.revision !== item.revision
  ) {
    return null;
  }
  return lesson;
}

function storedEligibilityReason(
  item: LessonEligibility,
): PlannerLessonCandidate["eligibilityReason"] {
  if (item.reason === "placement-waived") return "placement-waived";
  if (item.reason === "resume-in-progress") return "resume-in-progress";
  return "progress-satisfied";
}

function lessonCandidates(
  eligibility: readonly LessonEligibility[],
): readonly PlannerLessonCandidate[] {
  return eligibility.flatMap((item, curriculumOrder) => {
    if (
      item.availability !== "in_progress" &&
      item.availability !== "available"
    ) {
      return [];
    }
    return [
      {
        id: item.lesson.id,
        schemaVersion: item.lesson.schemaVersion,
        revision: item.lesson.revision,
        estimatedMinutes: item.lesson.estimatedMinutes,
        eligibilityReason: storedEligibilityReason(item),
        availability: item.availability,
        curriculumOrder,
      },
    ];
  });
}

function reviewCandidates(
  dependencies: GetTodayStudyDependencies,
  due: Awaited<ReturnType<PracticeRepository["listDueReviewItems"]>>,
  weakConceptIds: ReadonlySet<string>,
): readonly PlannerReviewCandidate[] {
  return due.flatMap((memory) => {
    const activity = getPracticeActivity(
      dependencies.catalog,
      memory.sourceActivityId,
    );
    if (!activity) return [];
    return [
      {
        id: memory.id,
        sourceActivityId: memory.sourceActivityId,
        conceptId: memory.conceptId,
        schemaVersion: activity.content.schemaVersion,
        revision: activity.content.revision,
        dueAt: memory.dueAt,
        modality: activity.content.modality,
        isWeakConcept: weakConceptIds.has(memory.conceptId),
      },
    ];
  });
}

function recordPlannerMetrics(
  telemetry: TelemetryHooks,
  durationMs: number,
  plan: ReturnType<typeof planDailySession>,
): void {
  telemetry.recordMetric({
    name: "study.planner.duration",
    value: durationMs,
    unit: "milliseconds",
  });
  telemetry.recordMetric({
    name: "study.planner.review_debt",
    value: plan.diagnostics.reviewDebtCount,
    unit: "count",
  });
  telemetry.recordMetric({
    name: "study.planner.new_content_suspended",
    value: plan.diagnostics.newContentSuspended ? 1 : 0,
    unit: "count",
  });
  for (const reasonCode of new Set(plan.items.map((item) => item.reasonCode))) {
    telemetry.recordMetric({
      name: "study.planner.reason_code",
      value: plan.items.filter((item) => item.reasonCode === reasonCode).length,
      unit: "count",
      attributes: { reasonCode },
    });
  }
}

function recordResumeMetric(
  telemetry: TelemetryHooks,
  session: StudySession,
  currentLocalStudyDate: string,
): void {
  telemetry.recordMetric({
    name: "study.session.resume",
    value: 1,
    unit: "count",
    attributes: {
      source:
        session.localStudyDate === currentLocalStudyDate
          ? "same-day"
          : "day-boundary",
      sessionLocalStudyDate: session.localStudyDate,
      currentLocalStudyDate,
    },
  });
}

async function buildPlan(
  dependencies: GetTodayStudyDependencies,
  journey: LearnerJourney,
  eligibility: readonly LessonEligibility[],
  now: Date,
) {
  const enrollmentId = journey.enrollment.id;
  const [due, weakConcepts, dueCount] = await Promise.all([
    dependencies.practice.listDueReviewItems(
      enrollmentId,
      now,
      MAX_PLANNER_REVIEWS,
    ),
    dependencies.practice.listWeakConcepts(enrollmentId, MAX_WEAK_CONCEPTS),
    dependencies.practice.countDueReviewItems?.(enrollmentId, now),
  ]);
  const weakConceptIds = new Set(
    weakConcepts.map((concept) => concept.conceptId),
  );
  const startedAt = performance.now();
  const plan = planDailySession({
    plannerVersion: DAILY_SESSION_PLANNER_VERSION,
    now,
    dailyGoalMinutes: journey.learnerProfile.dailyGoalMinutes,
    dueReviewCount: dueCount ?? due.length,
    lessons: lessonCandidates(eligibility),
    reviews: reviewCandidates(dependencies, due, weakConceptIds),
    availableModalities: dependencies.availableModalities,
  });
  recordPlannerMetrics(
    dependencies.telemetry,
    performance.now() - startedAt,
    plan,
  );
  return plan;
}

export function createGetTodayStudy(dependencies: GetTodayStudyDependencies) {
  return async function execute(journey: LearnerJourney): Promise<TodayStudy> {
    const now = dependencies.clock.now();
    const progress = await dependencies.study.listLessonProgress(
      journey.enrollment.id,
    );
    const eligibility = evaluateCurriculum({
      catalog: dependencies.catalog,
      entryPointLevel: journey.enrollment.entryPointLevel,
      enrollmentStatus: journey.enrollment.status,
      progress,
    });
    const studyDate = localStudyDate(now, journey.learnerProfile.timezone);

    const openSession = await dependencies.execution.findLatestOpenSession(
      journey.enrollment.id,
    );
    if (openSession) {
      recordResumeMetric(dependencies.telemetry, openSession, studyDate);
      return {
        localStudyDate: studyDate,
        eligibility,
        session: openSession,
        lesson: lessonForSession(dependencies.catalog, openSession),
      };
    }

    const existing = await dependencies.study.findDailySession(
      journey.enrollment.id,
      studyDate,
    );
    if (existing) {
      return {
        localStudyDate: studyDate,
        eligibility,
        session: existing,
        lesson: lessonForSession(dependencies.catalog, existing),
      };
    }

    const plan = await buildPlan(dependencies, journey, eligibility, now);
    if (plan.items.length === 0) {
      return {
        localStudyDate: studyDate,
        eligibility,
        session: null,
        lesson: null,
      };
    }

    const session = await dependencies.study.ensureDailySession({
      sessionId: dependencies.idGenerator.generate(),
      enrollmentId: journey.enrollment.id,
      localStudyDate: studyDate,
      plannerVersion: plan.plannerVersion,
      items: plan.items.map((item) => ({
        id: dependencies.idGenerator.generate(),
        kind: item.kind,
        resourceId: item.resourceId,
        schemaVersion: item.schemaVersion,
        revision: item.revision,
        reasonCode: item.reasonCode,
        eligibilityReason: item.eligibilityReason,
        estimatedMinutes: item.estimatedMinutes,
      })),
      now,
    });

    return {
      localStudyDate: studyDate,
      eligibility,
      session,
      lesson: lessonForSession(dependencies.catalog, session),
    };
  };
}
