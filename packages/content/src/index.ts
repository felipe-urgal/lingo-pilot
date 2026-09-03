/** Boundary for versioned pedagogical content schemas and validation. */
export {
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
  type ContentDocumentKind,
  type ContentStatus,
  type ContentValidationIssue,
  type ContentValidationResult,
  type ContentValidationRule,
  type Course,
  type LearningObjective,
  type Lesson,
  type Level,
  type LoadedContentDocument,
  type LocalizedText,
  type RevisionMetadata,
  type Unit,
  type VocabularyItem,
} from "./model.ts";
export { createCurriculumCatalog, type CurriculumCatalog } from "./catalog.ts";
export { parseContentDocument } from "./schema.ts";
export { validateContentGraph } from "./validation.ts";
export { validateContentInputs, type ContentInput } from "./validator.ts";

export const packageBoundary = "content" as const;
