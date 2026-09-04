import type {
  Clock,
  LearnerJourney,
  ProgressRepository,
  StudySessionStatus,
} from "../../../../packages/domain/src/index.ts";
import type {
  CurriculumCatalog,
  Lesson,
  Level,
  Unit,
} from "../../../../packages/content/src/index.ts";
import {
  evaluateCurriculum,
  nextEligibleLesson,
} from "../../../../packages/learning/src/index.ts";

const DEFAULT_HISTORY_PAGE_SIZE = 5;
const MAX_HISTORY_PAGE_SIZE = 10;
const WEAK_CONCEPT_LIMIT = 5;

export interface ProgressLocation {
  readonly entryPointLevel: "A0" | "A1" | "A2";
  readonly level: Readonly<{
    id: string;
    cefr: string;
    title: string;
  }> | null;
  readonly unit: Readonly<{
    id: string;
    title: string;
  }> | null;
  readonly lesson: Readonly<{
    id: string;
    title: string;
    status: "available" | "in_progress";
  }> | null;
}

export interface ProgressLearningSummary {
  readonly completedLessons: number;
  readonly startedLessons: number;
  readonly masteryConceptCount: number;
  readonly averageMasteryPercent: number | null;
  readonly averageConfidencePercent: number | null;
}

export interface ProgressWeakConcept {
  readonly id: string;
  readonly title: string;
  readonly scorePercent: number;
  readonly confidencePercent: number;
}

export interface ProgressHistoryItem {
  readonly id: string;
  readonly localStudyDate: string;
  readonly status: StudySessionStatus;
  readonly completedLessons: number;
  readonly completedReviews: number;
  readonly skippedItems: number;
}

export interface ProgressOverview {
  readonly location: ProgressLocation;
  readonly learning: ProgressLearningSummary;
  readonly dueReviewCount: number;
  readonly weakConcepts: readonly ProgressWeakConcept[];
  readonly history: Readonly<{
    page: number;
    pageSize: number;
    hasPrevious: boolean;
    hasMore: boolean;
    items: readonly ProgressHistoryItem[];
  }>;
}

export interface GetProgressOverviewDependencies {
  readonly clock: Clock;
  readonly catalog: CurriculumCatalog;
  readonly progress: ProgressRepository;
}

function localized(
  text: Readonly<Record<string, string>>,
  locale: string,
): string {
  return text[locale] ?? text["pt-BR"] ?? Object.values(text)[0] ?? "";
}

function lastProgressedLesson(
  catalog: CurriculumCatalog,
  progress: Awaited<
    ReturnType<ProgressRepository["loadProgressSnapshot"]>
  >["lessonProgress"],
): Lesson | null {
  const progressedIds = new Set(progress.map((item) => item.lessonId));
  return (
    [...catalog.lessons]
      .reverse()
      .find((candidate) => progressedIds.has(candidate.id)) ?? null
  );
}

function levelForLesson(
  catalog: CurriculumCatalog,
  lesson: Lesson | null,
  entryPointLevel: "A0" | "A1" | "A2",
): Level | null {
  if (lesson) return catalog.levelById.get(lesson.levelId) ?? null;
  return (
    catalog.levels.find(
      (candidate) =>
        candidate.cefr === entryPointLevel && candidate.status === "published",
    ) ?? null
  );
}

function unitForLesson(
  catalog: CurriculumCatalog,
  lesson: Lesson | null,
): Unit | null {
  if (!lesson) return null;
  return catalog.units.find((candidate) => candidate.id === lesson.unitId) ?? null;
}

function historyItem(
  session: Awaited<
    ReturnType<ProgressRepository["loadProgressSnapshot"]>
  >["recentSessions"][number],
): ProgressHistoryItem {
  const completed = session.items.filter((item) => item.status === "completed");
  return {
    id: session.id,
    localStudyDate: session.localStudyDate,
    status: session.status,
    completedLessons: completed.filter((item) => item.kind === "lesson").length,
    completedReviews: completed.filter((item) => item.kind === "review").length,
    skippedItems: session.items.filter((item) => item.status === "skipped").length,
  };
}

function safePage(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value <= 0) return 1;
  return Math.trunc(value);
}

function safePageSize(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value <= 0) {
    return DEFAULT_HISTORY_PAGE_SIZE;
  }
  return Math.min(MAX_HISTORY_PAGE_SIZE, Math.trunc(value));
}

export function createGetProgressOverview(
  dependencies: GetProgressOverviewDependencies,
) {
  return async function execute(
    journey: LearnerJourney,
    options: Readonly<{ historyPage?: number; historyPageSize?: number }> = {},
  ): Promise<ProgressOverview> {
    const page = safePage(options.historyPage);
    const pageSize = safePageSize(options.historyPageSize);
    const snapshot = await dependencies.progress.loadProgressSnapshot({
      enrollmentId: journey.enrollment.id,
      now: dependencies.clock.now(),
      historyLimit: pageSize,
      historyOffset: (page - 1) * pageSize,
      weakConceptLimit: WEAK_CONCEPT_LIMIT,
    });

    const eligibility = evaluateCurriculum({
      catalog: dependencies.catalog,
      entryPointLevel: journey.enrollment.entryPointLevel,
      enrollmentStatus: journey.enrollment.status,
      progress: snapshot.lessonProgress,
    });
    const current = nextEligibleLesson(eligibility);
    const lesson = current?.lesson ?? null;
    const locationLesson =
      lesson ?? lastProgressedLesson(dependencies.catalog, snapshot.lessonProgress);
    const level = levelForLesson(
      dependencies.catalog,
      locationLesson,
      journey.enrollment.entryPointLevel,
    );
    const unit = unitForLesson(dependencies.catalog, locationLesson);
    const locale = journey.learnerProfile.interfaceLocale;

    return {
      location: {
        entryPointLevel: journey.enrollment.entryPointLevel,
        level: level
          ? {
              id: level.id,
              cefr: level.cefr,
              title: localized(level.title, locale),
            }
          : null,
        unit: unit
          ? { id: unit.id, title: localized(unit.title, locale) }
          : null,
        lesson: lesson
          ? {
              id: lesson.id,
              title: localized(lesson.title, locale),
              status:
                current?.availability === "in_progress"
                  ? "in_progress"
                  : "available",
            }
          : null,
      },
      learning: {
        completedLessons: snapshot.lessonProgress.filter(
          (item) => item.status === "completed",
        ).length,
        startedLessons: snapshot.lessonProgress.filter(
          (item) => item.status === "in_progress",
        ).length,
        masteryConceptCount: snapshot.mastery.conceptCount,
        averageMasteryPercent: snapshot.mastery.averageScorePercent,
        averageConfidencePercent: snapshot.mastery.averageConfidencePercent,
      },
      dueReviewCount: snapshot.dueReviewCount,
      weakConcepts: snapshot.weakConcepts.flatMap((state) => {
        const concept = dependencies.catalog.conceptById.get(state.conceptId);
        if (!concept) return [];
        return [
          {
            id: state.conceptId,
            title: localized(concept.title, locale),
            scorePercent: state.scorePercent,
            confidencePercent: state.confidencePercent,
          },
        ];
      }),
      history: {
        page,
        pageSize,
        hasPrevious: page > 1,
        hasMore: snapshot.hasMoreSessions,
        items: snapshot.recentSessions.map(historyItem),
      },
    };
  };
}
