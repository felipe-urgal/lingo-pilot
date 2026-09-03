import type {
  Activity,
  Concept,
  ContentDocument,
  Course,
  Lesson,
  Level,
  Unit,
} from "./model.ts";

export interface CurriculumCatalog {
  readonly course: Course;
  readonly levels: readonly Level[];
  readonly units: readonly Unit[];
  readonly lessons: readonly Lesson[];
  readonly activities: readonly Activity[];
  readonly concepts: readonly Concept[];
  readonly levelById: ReadonlyMap<string, Level>;
  readonly lessonById: ReadonlyMap<string, Lesson>;
  readonly activityById: ReadonlyMap<string, Activity>;
  readonly conceptById: ReadonlyMap<string, Concept>;
}

function requireDocument<TKind extends ContentDocument["kind"]>(
  documents: ReadonlyMap<string, ContentDocument>,
  id: string,
  kind: TKind,
): Extract<ContentDocument, { kind: TKind }> {
  const document = documents.get(id);
  if (!document || document.kind !== kind) {
    throw new Error(`Expected ${kind} content document: ${id}`);
  }

  return document as Extract<ContentDocument, { kind: TKind }>;
}

export function createCurriculumCatalog(
  documents: readonly ContentDocument[],
  courseId: string,
): CurriculumCatalog {
  const documentsById = new Map(
    documents.map((document) => [document.id, document]),
  );
  const course = requireDocument(documentsById, courseId, "course");
  const levels = course.levelIds.map((id) =>
    requireDocument(documentsById, id, "level"),
  );
  const units = levels.flatMap((level) =>
    level.unitIds.map((id) => requireDocument(documentsById, id, "unit")),
  );
  const lessons = units.flatMap((unit) =>
    unit.lessonIds.map((id) => requireDocument(documentsById, id, "lesson")),
  );
  const activities = documents.filter(
    (document): document is Activity => document.kind === "activity",
  );
  const concepts = documents.filter(
    (document): document is Concept => document.kind === "concept",
  );

  return {
    course,
    levels,
    units,
    lessons,
    activities,
    concepts,
    levelById: new Map(levels.map((level) => [level.id, level])),
    lessonById: new Map(lessons.map((lesson) => [lesson.id, lesson])),
    activityById: new Map(
      activities.map((activity) => [activity.id, activity]),
    ),
    conceptById: new Map(concepts.map((concept) => [concept.id, concept])),
  };
}
