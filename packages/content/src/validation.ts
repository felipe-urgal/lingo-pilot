import type {
  Activity,
  Concept,
  ContentDocument,
  ContentStatus,
  ContentValidationIssue,
  ContentValidationRule,
  Course,
  Lesson,
  Level,
  LoadedContentDocument,
  LocalizedText,
  Unit,
  VocabularyItem,
} from "./model.ts";

type MutableIssues = ContentValidationIssue[];

type DocumentIndex = ReadonlyMap<string, LoadedContentDocument>;

function addIssue(
  issues: MutableIssues,
  owner: LoadedContentDocument,
  path: string,
  rule: ContentValidationRule,
  message: string,
): void {
  issues.push({ file: owner.file, path, rule, message });
}

function isPublished(status: ContentStatus): boolean {
  return status === "published";
}

function addDuplicateEntityIssues(
  documents: readonly LoadedContentDocument[],
  issues: MutableIssues,
): DocumentIndex {
  const grouped = new Map<string, LoadedContentDocument[]>();
  for (const loaded of documents) {
    const matches = grouped.get(loaded.document.id) ?? [];
    matches.push(loaded);
    grouped.set(loaded.document.id, matches);
  }

  const index = new Map<string, LoadedContentDocument>();
  for (const [id, matches] of grouped) {
    if (matches.length === 1) {
      const loaded = matches[0];
      if (loaded) index.set(id, loaded);
      continue;
    }

    for (const loaded of matches) {
      addIssue(
        issues,
        loaded,
        "$.id",
        "ID_DUPLICATE",
        `Content ID '${id}' is declared more than once.`,
      );
    }
  }
  return index;
}

function expectReference<TKind extends ContentDocument["kind"]>(
  index: DocumentIndex,
  issues: MutableIssues,
  owner: LoadedContentDocument,
  id: string,
  expectedKind: TKind,
  path: string,
): Extract<ContentDocument, { kind: TKind }> | null {
  const target = index.get(id);
  if (!target) {
    addIssue(
      issues,
      owner,
      path,
      "REFERENCE_MISSING",
      `Reference '${id}' does not exist.`,
    );
    return null;
  }
  if (target.document.kind !== expectedKind) {
    addIssue(
      issues,
      owner,
      path,
      "REFERENCE_KIND",
      `Reference '${id}' must point to ${expectedKind}, not ${target.document.kind}.`,
    );
    return null;
  }
  if (isPublished(owner.document.status) && !isPublished(target.document.status)) {
    addIssue(
      issues,
      owner,
      path,
      "REFERENCE_STATUS",
      `Published content cannot depend on '${id}' with status '${target.document.status}'.`,
    );
  }
  return target.document as Extract<ContentDocument, { kind: TKind }>;
}

function requireLocale(
  issues: MutableIssues,
  owner: LoadedContentDocument,
  text: LocalizedText,
  locale: string,
  path: string,
): void {
  if (text[locale]?.trim()) return;
  addIssue(
    issues,
    owner,
    path,
    "LOCALE_REQUIRED",
    `Locale '${locale}' is required here.`,
  );
}

function addLocalDuplicateIssues(
  issues: MutableIssues,
  owner: LoadedContentDocument,
  values: readonly string[],
  path: string,
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      addIssue(
        issues,
        owner,
        `${path}[${index}]`,
        "ID_DUPLICATE",
        `ID '${value}' is duplicated within this document.`,
      );
    }
    seen.add(value);
  }
}

function courseForLevel(
  index: DocumentIndex,
  issues: MutableIssues,
  owner: LoadedContentDocument,
  level: Level,
): Course | null {
  return expectReference(index, issues, owner, level.courseId, "course", "$.courseId");
}

function levelForUnit(
  index: DocumentIndex,
  issues: MutableIssues,
  owner: LoadedContentDocument,
  unit: Unit,
): Level | null {
  return expectReference(index, issues, owner, unit.levelId, "level", "$.levelId");
}

function unitForLesson(
  index: DocumentIndex,
  issues: MutableIssues,
  owner: LoadedContentDocument,
  lesson: Lesson,
): Unit | null {
  return expectReference(index, issues, owner, lesson.unitId, "unit", "$.unitId");
}

function courseFromLevelId(
  index: DocumentIndex,
  issues: MutableIssues,
  owner: LoadedContentDocument,
  levelId: string,
  path: string,
): Course | null {
  const level = expectReference(index, issues, owner, levelId, "level", path);
  if (!level) return null;
  return expectReference(index, issues, owner, level.courseId, "course", path);
}

function validateCourse(
  loaded: LoadedContentDocument & Readonly<{ document: Course }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const course = loaded.document;
  requireLocale(issues, loaded, course.title, course.sourceLocale, "$.title");
  for (const [position, levelId] of course.levelIds.entries()) {
    const level = expectReference(
      index,
      issues,
      loaded,
      levelId,
      "level",
      `$.levelIds[${position}]`,
    );
    if (level && level.courseId !== course.id) {
      addIssue(
        issues,
        loaded,
        `$.levelIds[${position}]`,
        "REFERENCE_OWNERSHIP",
        `Level '${levelId}' belongs to course '${level.courseId}', not '${course.id}'.`,
      );
    }
  }
}

function validateLevel(
  loaded: LoadedContentDocument & Readonly<{ document: Level }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const level = loaded.document;
  const course = courseForLevel(index, issues, loaded, level);
  if (course) requireLocale(issues, loaded, level.title, course.sourceLocale, "$.title");
  for (const [position, unitId] of level.unitIds.entries()) {
    const unit = expectReference(
      index,
      issues,
      loaded,
      unitId,
      "unit",
      `$.unitIds[${position}]`,
    );
    if (unit && unit.levelId !== level.id) {
      addIssue(
        issues,
        loaded,
        `$.unitIds[${position}]`,
        "REFERENCE_OWNERSHIP",
        `Unit '${unitId}' belongs to level '${unit.levelId}', not '${level.id}'.`,
      );
    }
  }
}

function validateUnit(
  loaded: LoadedContentDocument & Readonly<{ document: Unit }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const unit = loaded.document;
  const level = levelForUnit(index, issues, loaded, unit);
  const course = level
    ? expectReference(index, issues, loaded, level.courseId, "course", "$.levelId")
    : null;
  if (course) requireLocale(issues, loaded, unit.title, course.sourceLocale, "$.title");
  for (const [position, lessonId] of unit.lessonIds.entries()) {
    const lesson = expectReference(
      index,
      issues,
      loaded,
      lessonId,
      "lesson",
      `$.lessonIds[${position}]`,
    );
    if (lesson && lesson.unitId !== unit.id) {
      addIssue(
        issues,
        loaded,
        `$.lessonIds[${position}]`,
        "REFERENCE_OWNERSHIP",
        `Lesson '${lessonId}' belongs to unit '${lesson.unitId}', not '${unit.id}'.`,
      );
    }
  }
}

function validateLesson(
  loaded: LoadedContentDocument & Readonly<{ document: Lesson }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const lesson = loaded.document;
  const unit = unitForLesson(index, issues, loaded, lesson);
  const level = expectReference(index, issues, loaded, lesson.levelId, "level", "$.levelId");
  if (unit && unit.levelId !== lesson.levelId) {
    addIssue(
      issues,
      loaded,
      "$.levelId",
      "REFERENCE_OWNERSHIP",
      `Lesson level '${lesson.levelId}' does not match unit level '${unit.levelId}'.`,
    );
  }
  const course = level
    ? expectReference(index, issues, loaded, level.courseId, "course", "$.levelId")
    : null;
  if (course) {
    requireLocale(issues, loaded, lesson.title, course.sourceLocale, "$.title");
    for (const [position, objective] of lesson.objectives.entries()) {
      requireLocale(
        issues,
        loaded,
        objective.description,
        course.sourceLocale,
        `$.objectives[${position}].description`,
      );
    }
    for (const [position, block] of lesson.blocks.entries()) {
      requireLocale(
        issues,
        loaded,
        block.text,
        block.language ?? course.sourceLocale,
        `$.blocks[${position}].text`,
      );
    }
  }

  addLocalDuplicateIssues(
    issues,
    loaded,
    lesson.objectives.map((objective) => objective.id),
    "$.objectives",
  );
  addLocalDuplicateIssues(
    issues,
    loaded,
    lesson.blocks.map((block) => block.id),
    "$.blocks",
  );

  for (const [position, id] of lesson.prerequisiteLessonIds.entries()) {
    expectReference(
      index,
      issues,
      loaded,
      id,
      "lesson",
      `$.prerequisiteLessonIds[${position}]`,
    );
  }
  for (const [position, id] of lesson.introducesConceptIds.entries()) {
    expectReference(
      index,
      issues,
      loaded,
      id,
      "concept",
      `$.introducesConceptIds[${position}]`,
    );
  }
  for (const [position, id] of lesson.reinforcesConceptIds.entries()) {
    expectReference(
      index,
      issues,
      loaded,
      id,
      "concept",
      `$.reinforcesConceptIds[${position}]`,
    );
  }
  for (const [position, id] of lesson.vocabularyIds.entries()) {
    expectReference(
      index,
      issues,
      loaded,
      id,
      "vocabulary",
      `$.vocabularyIds[${position}]`,
    );
  }
  for (const [position, id] of lesson.activityIds.entries()) {
    const activity = expectReference(
      index,
      issues,
      loaded,
      id,
      "activity",
      `$.activityIds[${position}]`,
    );
    if (activity && activity.lessonId !== lesson.id) {
      addIssue(
        issues,
        loaded,
        `$.activityIds[${position}]`,
        "REFERENCE_OWNERSHIP",
        `Activity '${id}' belongs to lesson '${activity.lessonId}', not '${lesson.id}'.`,
      );
    }
  }
}

function validateActivity(
  loaded: LoadedContentDocument & Readonly<{ document: Activity }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const activity = loaded.document;
  const lesson = expectReference(
    index,
    issues,
    loaded,
    activity.lessonId,
    "lesson",
    "$.lessonId",
  );
  if (!lesson) return;

  const course = courseFromLevelId(
    index,
    issues,
    loaded,
    lesson.levelId,
    "$.lessonId",
  );
  if (course) {
    requireLocale(issues, loaded, activity.prompt, course.sourceLocale, "$.prompt");
  }

  const objectiveIds = new Set(lesson.objectives.map((objective) => objective.id));
  for (const [position, objectiveId] of activity.objectiveIds.entries()) {
    if (!objectiveIds.has(objectiveId)) {
      addIssue(
        issues,
        loaded,
        `$.objectiveIds[${position}]`,
        "REFERENCE_MISSING",
        `Objective '${objectiveId}' does not exist in lesson '${lesson.id}'.`,
      );
    }
  }
  for (const [position, conceptId] of activity.conceptIds.entries()) {
    expectReference(
      index,
      issues,
      loaded,
      conceptId,
      "concept",
      `$.conceptIds[${position}]`,
    );
  }
}

function validateConcept(
  loaded: LoadedContentDocument & Readonly<{ document: Concept }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const concept = loaded.document;
  const course = expectReference(
    index,
    issues,
    loaded,
    concept.courseId,
    "course",
    "$.courseId",
  );
  if (course) {
    requireLocale(issues, loaded, concept.title, course.sourceLocale, "$.title");
    requireLocale(
      issues,
      loaded,
      concept.description,
      course.sourceLocale,
      "$.description",
    );
  }
  for (const [position, id] of concept.prerequisiteConceptIds.entries()) {
    expectReference(
      index,
      issues,
      loaded,
      id,
      "concept",
      `$.prerequisiteConceptIds[${position}]`,
    );
  }
}

function validateVocabulary(
  loaded: LoadedContentDocument & Readonly<{ document: VocabularyItem }>,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  const vocabulary = loaded.document;
  const course = expectReference(
    index,
    issues,
    loaded,
    vocabulary.courseId,
    "course",
    "$.courseId",
  );
  const lesson = expectReference(
    index,
    issues,
    loaded,
    vocabulary.introducedInLessonId,
    "lesson",
    "$.introducedInLessonId",
  );
  if (course) {
    requireLocale(
      issues,
      loaded,
      vocabulary.translations,
      course.sourceLocale,
      "$.translations",
    );
    if (vocabulary.language !== course.targetLocale) {
      addIssue(
        issues,
        loaded,
        "$.language",
        "REFERENCE_OWNERSHIP",
        `Vocabulary language '${vocabulary.language}' must match course target locale '${course.targetLocale}'.`,
      );
    }
  }
  if (lesson && course) {
    const lessonCourse = courseFromLevelId(
      index,
      issues,
      loaded,
      lesson.levelId,
      "$.introducedInLessonId",
    );
    if (lessonCourse && lessonCourse.id !== course.id) {
      addIssue(
        issues,
        loaded,
        "$.introducedInLessonId",
        "REFERENCE_OWNERSHIP",
        `Introduction lesson '${lesson.id}' belongs to course '${lessonCourse.id}', not '${course.id}'.`,
      );
    }
  }
}

function validateDocument(
  loaded: LoadedContentDocument,
  index: DocumentIndex,
  issues: MutableIssues,
): void {
  switch (loaded.document.kind) {
    case "course":
      validateCourse(
        loaded as LoadedContentDocument & Readonly<{ document: Course }>,
        index,
        issues,
      );
      break;
    case "level":
      validateLevel(
        loaded as LoadedContentDocument & Readonly<{ document: Level }>,
        index,
        issues,
      );
      break;
    case "unit":
      validateUnit(
        loaded as LoadedContentDocument & Readonly<{ document: Unit }>,
        index,
        issues,
      );
      break;
    case "lesson":
      validateLesson(
        loaded as LoadedContentDocument & Readonly<{ document: Lesson }>,
        index,
        issues,
      );
      break;
    case "activity":
      validateActivity(
        loaded as LoadedContentDocument & Readonly<{ document: Activity }>,
        index,
        issues,
      );
      break;
    case "concept":
      validateConcept(
        loaded as LoadedContentDocument & Readonly<{ document: Concept }>,
        index,
        issues,
      );
      break;
    case "vocabulary":
      validateVocabulary(
        loaded as LoadedContentDocument & Readonly<{ document: VocabularyItem }>,
        index,
        issues,
      );
      break;
  }
}

function detectCycles<T extends Lesson | Concept>(
  documents: readonly LoadedContentDocument[],
  kind: T["kind"],
  dependencyIds: (document: T) => readonly string[],
  dependencyPath: string,
  issues: MutableIssues,
): void {
  const nodes = new Map<string, LoadedContentDocument & Readonly<{ document: T }>>();
  for (const loaded of documents) {
    if (loaded.document.kind === kind) {
      nodes.set(
        loaded.document.id,
        loaded as LoadedContentDocument & Readonly<{ document: T }>,
      );
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const reported = new Set<string>();

  function visit(id: string, trail: readonly string[]): void {
    if (visited.has(id)) return;
    const loaded = nodes.get(id);
    if (!loaded) return;
    visiting.add(id);

    for (const dependencyId of dependencyIds(loaded.document)) {
      if (!nodes.has(dependencyId)) continue;
      if (visiting.has(dependencyId)) {
        const cycle = [...trail, id, dependencyId];
        const key = [...new Set(cycle)].sort().join("|");
        if (!reported.has(key)) {
          reported.add(key);
          addIssue(
            issues,
            loaded,
            dependencyPath,
            "PREREQUISITE_CYCLE",
            `Prerequisite cycle detected: ${cycle.join(" -> ")}.`,
          );
        }
        continue;
      }
      visit(dependencyId, [...trail, id]);
    }

    visiting.delete(id);
    visited.add(id);
  }

  for (const id of nodes.keys()) visit(id, []);
}

export function validateContentGraph(
  documents: readonly LoadedContentDocument[],
): readonly ContentValidationIssue[] {
  const issues: MutableIssues = [];
  const index = addDuplicateEntityIssues(documents, issues);

  for (const loaded of documents) validateDocument(loaded, index, issues);

  detectCycles<Lesson>(
    documents,
    "lesson",
    (lesson) => lesson.prerequisiteLessonIds,
    "$.prerequisiteLessonIds",
    issues,
  );
  detectCycles<Concept>(
    documents,
    "concept",
    (concept) => concept.prerequisiteConceptIds,
    "$.prerequisiteConceptIds",
    issues,
  );

  return issues;
}
