import type { CurriculumCatalog, Lesson } from "../../content/src/index.ts";

export type CurriculumEntryPoint = "A0" | "A1" | "A2";
export type LessonProgressStatus = "in_progress" | "completed";
export type LessonAvailability =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "waived";
export type EligibilityReason =
  | "progress-satisfied"
  | "placement-waived"
  | "prerequisite-missing"
  | "content-unavailable"
  | "enrollment-inactive"
  | "resume-in-progress"
  | "already-completed"
  | "revision-mismatch";

export interface LessonProgressSnapshot {
  readonly lessonId: string;
  readonly status: LessonProgressStatus;
  readonly contentSchemaVersion: number;
  readonly contentRevision: number;
}

export interface LessonEligibility {
  readonly lesson: Lesson;
  readonly availability: LessonAvailability;
  readonly reason: EligibilityReason;
}

export interface EvaluateCurriculumInput {
  readonly catalog: CurriculumCatalog;
  readonly entryPointLevel: CurriculumEntryPoint;
  readonly enrollmentStatus: string;
  readonly progress: readonly LessonProgressSnapshot[];
}

const levelRanks: Readonly<Record<CurriculumEntryPoint, number>> = {
  A0: 0,
  A1: 1,
  A2: 2,
};

function lessonRank(catalog: CurriculumCatalog, lesson: Lesson): number {
  const level = catalog.levelById.get(lesson.levelId);
  if (!level || !(level.cefr in levelRanks)) return Number.POSITIVE_INFINITY;
  return levelRanks[level.cefr as CurriculumEntryPoint];
}

function progressByLesson(
  progress: readonly LessonProgressSnapshot[],
): ReadonlyMap<string, LessonProgressSnapshot> {
  return new Map(progress.map((item) => [item.lessonId, item]));
}

function hasRevisionMismatch(
  lesson: Lesson,
  progress: LessonProgressSnapshot,
): boolean {
  return (
    progress.status === "in_progress" &&
    (progress.contentSchemaVersion !== lesson.schemaVersion ||
      progress.contentRevision !== lesson.revision)
  );
}

function prerequisiteReason(
  input: EvaluateCurriculumInput,
  lesson: Lesson,
  progress: ReadonlyMap<string, LessonProgressSnapshot>,
): EligibilityReason {
  let usedPlacementWaiver = false;
  const entryRank = levelRanks[input.entryPointLevel];

  for (const prerequisiteId of lesson.prerequisiteLessonIds) {
    if (progress.get(prerequisiteId)?.status === "completed") continue;

    const prerequisite = input.catalog.lessonById.get(prerequisiteId);
    if (prerequisite && lessonRank(input.catalog, prerequisite) < entryRank) {
      usedPlacementWaiver = true;
      continue;
    }

    return "prerequisite-missing";
  }

  return usedPlacementWaiver ? "placement-waived" : "progress-satisfied";
}

function evaluateLesson(
  input: EvaluateCurriculumInput,
  lesson: Lesson,
  progress: ReadonlyMap<string, LessonProgressSnapshot>,
): LessonEligibility {
  if (input.enrollmentStatus !== "active") {
    return { lesson, availability: "locked", reason: "enrollment-inactive" };
  }
  if (lesson.status !== "published") {
    return { lesson, availability: "locked", reason: "content-unavailable" };
  }

  const saved = progress.get(lesson.id);
  if (saved && hasRevisionMismatch(lesson, saved)) {
    return { lesson, availability: "locked", reason: "revision-mismatch" };
  }
  if (saved?.status === "completed") {
    return { lesson, availability: "completed", reason: "already-completed" };
  }
  if (saved?.status === "in_progress") {
    return { lesson, availability: "in_progress", reason: "resume-in-progress" };
  }
  if (lessonRank(input.catalog, lesson) < levelRanks[input.entryPointLevel]) {
    return { lesson, availability: "waived", reason: "placement-waived" };
  }

  const reason = prerequisiteReason(input, lesson, progress);
  return reason === "prerequisite-missing"
    ? { lesson, availability: "locked", reason }
    : { lesson, availability: "available", reason };
}

export function evaluateCurriculum(
  input: EvaluateCurriculumInput,
): readonly LessonEligibility[] {
  const progress = progressByLesson(input.progress);
  return input.catalog.lessons.map((lesson) =>
    evaluateLesson(input, lesson, progress),
  );
}

export function nextEligibleLesson(
  eligibility: readonly LessonEligibility[],
): LessonEligibility | null {
  return (
    eligibility.find((item) => item.availability === "in_progress") ??
    eligibility.find((item) => item.availability === "available") ??
    null
  );
}

export function canStartLesson(
  eligibility: readonly LessonEligibility[],
  lessonId: string,
): boolean {
  const lesson = eligibility.find((item) => item.lesson.id === lessonId);
  return (
    lesson?.availability === "available" || lesson?.availability === "in_progress"
  );
}
