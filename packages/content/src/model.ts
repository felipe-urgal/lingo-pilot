export const CONTENT_SCHEMA_VERSION = 1 as const;

export const contentStatuses = [
  "draft",
  "review",
  "published",
  "retired",
] as const;
export type ContentStatus = (typeof contentStatuses)[number];

export const contentBlockTypes = [
  "explanation",
  "rule",
  "example",
  "comparison",
  "common-error",
  "vocabulary",
  "pronunciation",
  "media",
  "checkpoint",
] as const;
export type ContentBlockType = (typeof contentBlockTypes)[number];

export const activityTypes = [
  "single-choice",
  "multiple-choice",
  "fill-blank",
  "word-order",
  "matching",
  "short-answer",
  "translation",
  "listening-comprehension",
  "speaking-prompt",
  "writing-prompt",
] as const;
export type ActivityType = (typeof activityTypes)[number];

export const activityModalities = [
  "reading",
  "listening",
  "writing",
  "speaking",
  "mixed",
] as const;
export type ActivityModality = (typeof activityModalities)[number];

export const evaluationTypes = ["deterministic", "manual", "ai"] as const;
export type EvaluationType = (typeof evaluationTypes)[number];

export const cefrLevels = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof cefrLevels)[number];

export type LocalizedText = Readonly<Record<string, string>>;

export type RevisionMetadata = Readonly<{
  schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  revision: number;
  status: ContentStatus;
}>;

export type ContentEntityBase<TKind extends string> = RevisionMetadata &
  Readonly<{
    kind: TKind;
    id: string;
  }>;

export type LearningObjective = Readonly<{
  id: string;
  description: LocalizedText;
}>;

export type ContentBlock = Readonly<{
  id: string;
  type: ContentBlockType;
  text: LocalizedText;
  language?: string;
}>;

export type ActivityEvaluation = Readonly<{
  type: EvaluationType;
  acceptedAnswers?: readonly string[];
}>;

export type Course = ContentEntityBase<"course"> &
  Readonly<{
    sourceLocale: string;
    targetLocale: string;
    title: LocalizedText;
    levelIds: readonly string[];
  }>;

export type Level = ContentEntityBase<"level"> &
  Readonly<{
    courseId: string;
    cefr: CefrLevel;
    title: LocalizedText;
    unitIds: readonly string[];
  }>;

export type Unit = ContentEntityBase<"unit"> &
  Readonly<{
    levelId: string;
    title: LocalizedText;
    lessonIds: readonly string[];
  }>;

export type Lesson = ContentEntityBase<"lesson"> &
  Readonly<{
    levelId: string;
    unitId: string;
    title: LocalizedText;
    estimatedMinutes: number;
    objectives: readonly LearningObjective[];
    prerequisiteLessonIds: readonly string[];
    introducesConceptIds: readonly string[];
    reinforcesConceptIds: readonly string[];
    vocabularyIds: readonly string[];
    blocks: readonly ContentBlock[];
    activityIds: readonly string[];
  }>;

export type Activity = ContentEntityBase<"activity"> &
  Readonly<{
    lessonId: string;
    type: ActivityType;
    prompt: LocalizedText;
    evaluation: ActivityEvaluation;
    conceptIds: readonly string[];
    objectiveIds: readonly string[];
    modality: ActivityModality;
    supportLevel: number;
    difficulty: number;
  }>;

export type Concept = ContentEntityBase<"concept"> &
  Readonly<{
    courseId: string;
    title: LocalizedText;
    description: LocalizedText;
    prerequisiteConceptIds: readonly string[];
  }>;

export type VocabularyItem = ContentEntityBase<"vocabulary"> &
  Readonly<{
    courseId: string;
    lemma: string;
    language: string;
    partOfSpeech: string;
    translations: LocalizedText;
    introducedInLessonId: string;
  }>;

export type ContentDocument =
  Course | Level | Unit | Lesson | Activity | Concept | VocabularyItem;

export type ContentDocumentKind = ContentDocument["kind"];

export type LoadedContentDocument = Readonly<{
  file: string;
  document: ContentDocument;
}>;

export type ContentValidationRule =
  | "JSON_PARSE"
  | "SCHEMA_REQUIRED"
  | "SCHEMA_TYPE"
  | "SCHEMA_VALUE"
  | "SCHEMA_VERSION"
  | "ID_FORMAT"
  | "ID_DUPLICATE"
  | "REFERENCE_MISSING"
  | "REFERENCE_KIND"
  | "REFERENCE_OWNERSHIP"
  | "REFERENCE_STATUS"
  | "PREREQUISITE_CYCLE"
  | "LOCALE_INVALID"
  | "LOCALE_REQUIRED"
  | "LESSON_OBJECTIVE_REQUIRED"
  | "ACTIVITY_EVALUATION_REQUIRED"
  | "ACTIVITY_CONCEPT_REQUIRED"
  | "ACTIVITY_OBJECTIVE_REQUIRED";

export type ContentValidationIssue = Readonly<{
  file: string;
  path: string;
  rule: ContentValidationRule;
  message: string;
}>;

export type ContentValidationResult = Readonly<{
  documents: readonly LoadedContentDocument[];
  issues: readonly ContentValidationIssue[];
}>;
