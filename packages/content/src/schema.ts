import {
  CONTENT_SCHEMA_VERSION,
  activityModalities,
  activityTypes,
  cefrLevels,
  contentBlockTypes,
  contentStatuses,
  evaluationTypes,
  type Activity,
  type ActivityEvaluation,
  type ActivityModality,
  type ActivityType,
  type CefrLevel,
  type Concept,
  type ContentBlock,
  type ContentBlockType,
  type ContentDocument,
  type ContentStatus,
  type ContentValidationIssue,
  type ContentValidationRule,
  type Course,
  type LearningObjective,
  type Lesson,
  type Level,
  type LocalizedText,
  type RevisionMetadata,
  type Unit,
  type VocabularyItem,
} from "./model.ts";

const stableIdPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;

type MutableIssues = ContentValidationIssue[];
type UnknownRecord = Record<string, unknown>;

type ParseContext = Readonly<{
  file: string;
  issues: MutableIssues;
}>;

type EntityBase = RevisionMetadata &
  Readonly<{
    id: string;
  }>;

function addIssue(
  context: ParseContext,
  path: string,
  rule: ContentValidationRule,
  message: string,
): void {
  context.issues.push({ file: context.file, path, rule, message });
}

function asRecord(
  value: unknown,
  context: ParseContext,
  path: string,
): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    addIssue(context, path, "SCHEMA_TYPE", "Expected an object.");
    return null;
  }

  return value as UnknownRecord;
}

function requiredString(
  record: UnknownRecord,
  key: string,
  context: ParseContext,
  path: string,
): string | null {
  const value = record[key];
  const valuePath = `${path}.${key}`;
  if (value === undefined) {
    addIssue(context, valuePath, "SCHEMA_REQUIRED", "Field is required.");
    return null;
  }
  if (typeof value !== "string") {
    addIssue(context, valuePath, "SCHEMA_TYPE", "Expected a string.");
    return null;
  }
  if (value.trim().length === 0) {
    addIssue(context, valuePath, "SCHEMA_VALUE", "String cannot be empty.");
    return null;
  }
  return value;
}

function requiredInteger(
  record: UnknownRecord,
  key: string,
  context: ParseContext,
  path: string,
  minimum = 1,
): number | null {
  const value = record[key];
  const valuePath = `${path}.${key}`;
  if (value === undefined) {
    addIssue(context, valuePath, "SCHEMA_REQUIRED", "Field is required.");
    return null;
  }
  if (!Number.isInteger(value) || typeof value !== "number") {
    addIssue(context, valuePath, "SCHEMA_TYPE", "Expected an integer.");
    return null;
  }
  if (value < minimum) {
    addIssue(
      context,
      valuePath,
      "SCHEMA_VALUE",
      `Expected an integer greater than or equal to ${minimum}.`,
    );
    return null;
  }
  return value;
}

function requiredStringArray(
  record: UnknownRecord,
  key: string,
  context: ParseContext,
  path: string,
): string[] | null {
  const value = record[key];
  const valuePath = `${path}.${key}`;
  if (value === undefined) {
    addIssue(context, valuePath, "SCHEMA_REQUIRED", "Field is required.");
    return null;
  }
  if (!Array.isArray(value)) {
    addIssue(context, valuePath, "SCHEMA_TYPE", "Expected an array.");
    return null;
  }

  const result: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim().length === 0) {
      addIssue(
        context,
        `${valuePath}[${index}]`,
        "SCHEMA_TYPE",
        "Expected a non-empty string.",
      );
      continue;
    }
    result.push(item);
  }
  return result;
}

function optionalStringArray(
  record: UnknownRecord,
  key: string,
  context: ParseContext,
  path: string,
): string[] | null {
  if (record[key] === undefined) return [];
  return requiredStringArray(record, key, context, path);
}

function isValidLocale(locale: string): boolean {
  try {
    new Intl.Locale(locale);
    return true;
  } catch {
    return false;
  }
}

function requiredLocale(
  record: UnknownRecord,
  key: string,
  context: ParseContext,
  path: string,
): string | null {
  const value = requiredString(record, key, context, path);
  if (value === null) return null;
  if (!isValidLocale(value)) {
    addIssue(
      context,
      `${path}.${key}`,
      "LOCALE_INVALID",
      `Invalid locale '${value}'.`,
    );
    return null;
  }
  return value;
}

function parseLocalizedText(
  value: unknown,
  context: ParseContext,
  path: string,
): LocalizedText | null {
  const record = asRecord(value, context, path);
  if (record === null) return null;

  const entries = Object.entries(record);
  if (entries.length === 0) {
    addIssue(context, path, "SCHEMA_VALUE", "Localized text cannot be empty.");
    return null;
  }

  const result: Record<string, string> = {};
  for (const [locale, text] of entries) {
    if (!isValidLocale(locale)) {
      addIssue(
        context,
        `${path}.${locale}`,
        "LOCALE_INVALID",
        `Invalid locale '${locale}'.`,
      );
      continue;
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      addIssue(
        context,
        `${path}.${locale}`,
        "SCHEMA_TYPE",
        "Localized text must be a non-empty string.",
      );
      continue;
    }
    result[locale] = text;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function requiredLocalizedText(
  record: UnknownRecord,
  key: string,
  context: ParseContext,
  path: string,
): LocalizedText | null {
  const valuePath = `${path}.${key}`;
  if (record[key] === undefined) {
    addIssue(context, valuePath, "SCHEMA_REQUIRED", "Field is required.");
    return null;
  }
  return parseLocalizedText(record[key], context, valuePath);
}

function requiredEnum<T extends string>(
  record: UnknownRecord,
  key: string,
  allowed: readonly T[],
  context: ParseContext,
  path: string,
): T | null {
  const value = requiredString(record, key, context, path);
  if (value === null) return null;
  if (!allowed.includes(value as T)) {
    addIssue(
      context,
      `${path}.${key}`,
      "SCHEMA_VALUE",
      `Expected one of: ${allowed.join(", ")}.`,
    );
    return null;
  }
  return value as T;
}

function validateStableId(
  id: string,
  context: ParseContext,
  path: string,
): boolean {
  if (stableIdPattern.test(id)) return true;
  addIssue(
    context,
    path,
    "ID_FORMAT",
    "ID must be lowercase and contain at least one '.', '-' or '_' separator.",
  );
  return false;
}

function parseEntityBase(
  record: UnknownRecord,
  context: ParseContext,
  path: string,
): EntityBase | null {
  const id = requiredString(record, "id", context, path);
  const schemaVersion = requiredInteger(
    record,
    "schemaVersion",
    context,
    path,
  );
  const revision = requiredInteger(record, "revision", context, path);
  const status = requiredEnum<ContentStatus>(
    record,
    "status",
    contentStatuses,
    context,
    path,
  );

  if (id !== null) validateStableId(id, context, `${path}.id`);
  if (
    schemaVersion !== null &&
    schemaVersion !== CONTENT_SCHEMA_VERSION
  ) {
    addIssue(
      context,
      `${path}.schemaVersion`,
      "SCHEMA_VERSION",
      `Unsupported schema version ${schemaVersion}; expected ${CONTENT_SCHEMA_VERSION}.`,
    );
  }

  if (
    id === null ||
    schemaVersion !== CONTENT_SCHEMA_VERSION ||
    revision === null ||
    status === null
  ) {
    return null;
  }

  return { id, schemaVersion: CONTENT_SCHEMA_VERSION, revision, status };
}

function parseLearningObjectives(
  value: unknown,
  context: ParseContext,
  path: string,
): LearningObjective[] | null {
  if (!Array.isArray(value)) {
    addIssue(context, path, "SCHEMA_TYPE", "Expected an array.");
    return null;
  }

  const result: LearningObjective[] = [];
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    const record = asRecord(item, context, itemPath);
    if (record === null) continue;
    const id = requiredString(record, "id", context, itemPath);
    const description = requiredLocalizedText(
      record,
      "description",
      context,
      itemPath,
    );
    if (id !== null) validateStableId(id, context, `${itemPath}.id`);
    if (id !== null && description !== null) result.push({ id, description });
  }
  return result;
}

function parseContentBlocks(
  value: unknown,
  context: ParseContext,
  path: string,
): ContentBlock[] | null {
  if (!Array.isArray(value)) {
    addIssue(context, path, "SCHEMA_TYPE", "Expected an array.");
    return null;
  }

  const result: ContentBlock[] = [];
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    const record = asRecord(item, context, itemPath);
    if (record === null) continue;
    const id = requiredString(record, "id", context, itemPath);
    const type = requiredEnum<ContentBlockType>(
      record,
      "type",
      contentBlockTypes,
      context,
      itemPath,
    );
    const text = requiredLocalizedText(record, "text", context, itemPath);
    let language: string | undefined;
    if (record.language !== undefined) {
      const parsedLanguage = requiredLocale(record, "language", context, itemPath);
      if (parsedLanguage !== null) language = parsedLanguage;
    }
    if (id !== null) validateStableId(id, context, `${itemPath}.id`);
    if (id !== null && type !== null && text !== null) {
      result.push({ id, type, text, ...(language ? { language } : {}) });
    }
  }
  return result;
}

function parseEvaluation(
  value: unknown,
  context: ParseContext,
  path: string,
): ActivityEvaluation | null {
  if (value === undefined) {
    addIssue(
      context,
      path,
      "ACTIVITY_EVALUATION_REQUIRED",
      "Activity evaluation is required.",
    );
    return null;
  }
  const record = asRecord(value, context, path);
  if (record === null) return null;
  const type = requiredEnum(
    record,
    "type",
    evaluationTypes,
    context,
    path,
  );
  const acceptedAnswers = optionalStringArray(
    record,
    "acceptedAnswers",
    context,
    path,
  );
  if (type === null || acceptedAnswers === null) return null;
  if (type === "deterministic" && acceptedAnswers.length === 0) {
    addIssue(
      context,
      `${path}.acceptedAnswers`,
      "SCHEMA_VALUE",
      "Deterministic evaluation requires at least one accepted answer.",
    );
    return null;
  }
  return {
    type,
    ...(acceptedAnswers.length > 0 ? { acceptedAnswers } : {}),
  };
}

function parseCourse(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): Course | null {
  const sourceLocale = requiredLocale(record, "sourceLocale", context, "$ ".trim());
  const targetLocale = requiredLocale(record, "targetLocale", context, "$ ".trim());
  const title = requiredLocalizedText(record, "title", context, "$ ".trim());
  const levelIds = requiredStringArray(record, "levelIds", context, "$ ".trim());
  if (
    sourceLocale === null ||
    targetLocale === null ||
    title === null ||
    levelIds === null
  ) {
    return null;
  }
  if (sourceLocale === targetLocale) {
    addIssue(
      context,
      "$.targetLocale",
      "SCHEMA_VALUE",
      "Source and target locales must be different.",
    );
  }
  return {
    ...base,
    kind: "course",
    sourceLocale,
    targetLocale,
    title,
    levelIds,
  };
}

function parseLevel(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): Level | null {
  const courseId = requiredString(record, "courseId", context, "$");
  const cefr = requiredEnum<CefrLevel>(
    record,
    "cefr",
    cefrLevels,
    context,
    "$",
  );
  const title = requiredLocalizedText(record, "title", context, "$ ".trim());
  const unitIds = requiredStringArray(record, "unitIds", context, "$");
  if (courseId === null || cefr === null || title === null || unitIds === null) {
    return null;
  }
  return { ...base, kind: "level", courseId, cefr, title, unitIds };
}

function parseUnit(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): Unit | null {
  const levelId = requiredString(record, "levelId", context, "$");
  const title = requiredLocalizedText(record, "title", context, "$");
  const lessonIds = requiredStringArray(record, "lessonIds", context, "$");
  if (levelId === null || title === null || lessonIds === null) return null;
  return { ...base, kind: "unit", levelId, title, lessonIds };
}

function parseLesson(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): Lesson | null {
  const levelId = requiredString(record, "levelId", context, "$");
  const unitId = requiredString(record, "unitId", context, "$");
  const title = requiredLocalizedText(record, "title", context, "$");
  const estimatedMinutes = requiredInteger(
    record,
    "estimatedMinutes",
    context,
    "$",
  );
  const objectives = parseLearningObjectives(
    record.objectives,
    context,
    "$.objectives",
  );
  const prerequisiteLessonIds = requiredStringArray(
    record,
    "prerequisiteLessonIds",
    context,
    "$",
  );
  const introducesConceptIds = requiredStringArray(
    record,
    "introducesConceptIds",
    context,
    "$",
  );
  const reinforcesConceptIds = requiredStringArray(
    record,
    "reinforcesConceptIds",
    context,
    "$",
  );
  const vocabularyIds = requiredStringArray(
    record,
    "vocabularyIds",
    context,
    "$",
  );
  const blocks = parseContentBlocks(record.blocks, context, "$.blocks");
  const activityIds = requiredStringArray(record, "activityIds", context, "$");

  if (base.status === "published" && objectives?.length === 0) {
    addIssue(
      context,
      "$.objectives",
      "LESSON_OBJECTIVE_REQUIRED",
      "Published lesson requires at least one learning objective.",
    );
  }

  if (
    levelId === null ||
    unitId === null ||
    title === null ||
    estimatedMinutes === null ||
    objectives === null ||
    prerequisiteLessonIds === null ||
    introducesConceptIds === null ||
    reinforcesConceptIds === null ||
    vocabularyIds === null ||
    blocks === null ||
    activityIds === null
  ) {
    return null;
  }

  return {
    ...base,
    kind: "lesson",
    levelId,
    unitId,
    title,
    estimatedMinutes,
    objectives,
    prerequisiteLessonIds,
    introducesConceptIds,
    reinforcesConceptIds,
    vocabularyIds,
    blocks,
    activityIds,
  };
}

function parseActivity(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): Activity | null {
  const lessonId = requiredString(record, "lessonId", context, "$");
  const type = requiredEnum<ActivityType>(
    record,
    "type",
    activityTypes,
    context,
    "$",
  );
  const prompt = requiredLocalizedText(record, "prompt", context, "$");
  const evaluation = parseEvaluation(
    record.evaluation,
    context,
    "$.evaluation",
  );
  const conceptIds = requiredStringArray(record, "conceptIds", context, "$");
  const objectiveIds = requiredStringArray(
    record,
    "objectiveIds",
    context,
    "$",
  );
  const modality = requiredEnum<ActivityModality>(
    record,
    "modality",
    activityModalities,
    context,
    "$",
  );
  const supportLevel = requiredInteger(record, "supportLevel", context, "$", 0);
  const difficulty = requiredInteger(record, "difficulty", context, "$", 1);

  if (conceptIds?.length === 0) {
    addIssue(
      context,
      "$.conceptIds",
      "ACTIVITY_CONCEPT_REQUIRED",
      "Activity must evaluate at least one concept.",
    );
  }
  if (objectiveIds?.length === 0) {
    addIssue(
      context,
      "$.objectiveIds",
      "ACTIVITY_OBJECTIVE_REQUIRED",
      "Activity must link to at least one lesson objective.",
    );
  }
  if (difficulty !== null && difficulty > 5) {
    addIssue(
      context,
      "$.difficulty",
      "SCHEMA_VALUE",
      "Difficulty must be between 1 and 5.",
    );
  }

  if (
    lessonId === null ||
    type === null ||
    prompt === null ||
    evaluation === null ||
    conceptIds === null ||
    objectiveIds === null ||
    modality === null ||
    supportLevel === null ||
    difficulty === null ||
    difficulty > 5
  ) {
    return null;
  }

  return {
    ...base,
    kind: "activity",
    lessonId,
    type,
    prompt,
    evaluation,
    conceptIds,
    objectiveIds,
    modality,
    supportLevel,
    difficulty,
  };
}

function parseConcept(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): Concept | null {
  const courseId = requiredString(record, "courseId", context, "$");
  const title = requiredLocalizedText(record, "title", context, "$");
  const description = requiredLocalizedText(
    record,
    "description",
    context,
    "$",
  );
  const prerequisiteConceptIds = requiredStringArray(
    record,
    "prerequisiteConceptIds",
    context,
    "$",
  );
  if (
    courseId === null ||
    title === null ||
    description === null ||
    prerequisiteConceptIds === null
  ) {
    return null;
  }
  return {
    ...base,
    kind: "concept",
    courseId,
    title,
    description,
    prerequisiteConceptIds,
  };
}

function parseVocabulary(
  record: UnknownRecord,
  base: EntityBase,
  context: ParseContext,
): VocabularyItem | null {
  const courseId = requiredString(record, "courseId", context, "$");
  const lemma = requiredString(record, "lemma", context, "$");
  const language = requiredLocale(record, "language", context, "$");
  const partOfSpeech = requiredString(record, "partOfSpeech", context, "$");
  const translations = requiredLocalizedText(
    record,
    "translations",
    context,
    "$",
  );
  const introducedInLessonId = requiredString(
    record,
    "introducedInLessonId",
    context,
    "$",
  );
  if (
    courseId === null ||
    lemma === null ||
    language === null ||
    partOfSpeech === null ||
    translations === null ||
    introducedInLessonId === null
  ) {
    return null;
  }
  return {
    ...base,
    kind: "vocabulary",
    courseId,
    lemma,
    language,
    partOfSpeech,
    translations,
    introducedInLessonId,
  };
}

export function parseContentDocument(
  input: unknown,
  file: string,
): Readonly<{
  document: ContentDocument | null;
  issues: readonly ContentValidationIssue[];
}> {
  const issues: MutableIssues = [];
  const context: ParseContext = { file, issues };
  const record = asRecord(input, context, "$");
  if (record === null) return { document: null, issues };

  const kind = requiredString(record, "kind", context, "$");
  const base = parseEntityBase(record, context, "$");
  if (kind === null || base === null) return { document: null, issues };

  let document: ContentDocument | null;
  switch (kind) {
    case "course":
      document = parseCourse(record, base, context);
      break;
    case "level":
      document = parseLevel(record, base, context);
      break;
    case "unit":
      document = parseUnit(record, base, context);
      break;
    case "lesson":
      document = parseLesson(record, base, context);
      break;
    case "activity":
      document = parseActivity(record, base, context);
      break;
    case "concept":
      document = parseConcept(record, base, context);
      break;
    case "vocabulary":
      document = parseVocabulary(record, base, context);
      break;
    default:
      addIssue(
        context,
        "$.kind",
        "SCHEMA_VALUE",
        `Unsupported content kind '${kind}'.`,
      );
      document = null;
  }

  return { document, issues };
}
