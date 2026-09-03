import type {
  Clock,
  IdGenerator,
  LearnerJourney,
  StoredEligibilityReason,
  StudyRepository,
  StudySession,
} from "../../../../packages/domain/src/index.ts";
import type {
  CurriculumCatalog,
  Lesson,
} from "../../../../packages/content/src/index.ts";
import {
  evaluateCurriculum,
  localStudyDate,
  nextEligibleLesson,
  type LessonEligibility,
} from "../../../../packages/learning/src/index.ts";

export const TODAY_PLANNER_VERSION = "today-shell-v1";

export interface TodayStudy {
  readonly localStudyDate: string;
  readonly eligibility: readonly LessonEligibility[];
  readonly session: StudySession | null;
  readonly lesson: Lesson | null;
}

export interface GetTodayStudyDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly catalog: CurriculumCatalog;
  readonly study: StudyRepository;
}

function lessonForSession(
  catalog: CurriculumCatalog,
  session: StudySession,
): Lesson | null {
  const item = session.items.find((candidate) => candidate.kind === "lesson");
  if (!item) return null;

  const lesson = catalog.lessonById.get(item.resourceId);
  if (
    !lesson ||
    lesson.status !== "published" ||
    lesson.schemaVersion !== item.schemaVersion ||
    lesson.revision !== item.revision
  ) {
    return null;
  }
  return lesson;
}

function storedEligibilityReason(
  candidate: LessonEligibility,
): StoredEligibilityReason {
  if (candidate.availability === "in_progress") return "resume-in-progress";
  return candidate.reason === "placement-waived"
    ? "placement-waived"
    : "progress-satisfied";
}

export function createGetTodayStudy(dependencies: GetTodayStudyDependencies) {
  return async function execute(journey: LearnerJourney): Promise<TodayStudy> {
    const progress = await dependencies.study.listLessonProgress(
      journey.enrollment.id,
    );
    const eligibility = evaluateCurriculum({
      catalog: dependencies.catalog,
      entryPointLevel: journey.enrollment.entryPointLevel,
      enrollmentStatus: journey.enrollment.status,
      progress,
    });
    const studyDate = localStudyDate(
      dependencies.clock.now(),
      journey.learnerProfile.timezone,
    );
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

    const candidate = nextEligibleLesson(eligibility);
    if (!candidate) {
      return {
        localStudyDate: studyDate,
        eligibility,
        session: null,
        lesson: null,
      };
    }

    const now = dependencies.clock.now();
    const session = await dependencies.study.ensureDailySession({
      sessionId: dependencies.idGenerator.generate(),
      itemId: dependencies.idGenerator.generate(),
      enrollmentId: journey.enrollment.id,
      localStudyDate: studyDate,
      plannerVersion: TODAY_PLANNER_VERSION,
      lessonId: candidate.lesson.id,
      contentSchemaVersion: candidate.lesson.schemaVersion,
      contentRevision: candidate.lesson.revision,
      estimatedMinutes: candidate.lesson.estimatedMinutes,
      eligibilityReason: storedEligibilityReason(candidate),
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
