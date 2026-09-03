import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { enrollments } from "./schema.ts";
import { sessionItems } from "./study-schema.ts";

export const activityAttempts = pgTable(
  "activity_attempts",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    sessionItemId: text("session_item_id").references(() => sessionItems.id, {
      onDelete: "set null",
    }),
    activityId: text("activity_id").notNull(),
    contentSchemaVersion: integer("content_schema_version").notNull(),
    contentRevision: integer("content_revision").notNull(),
    operationKey: text("operation_key").notNull(),
    answer: jsonb("answer").notNull(),
    evaluationSource: text("evaluation_source").notNull(),
    correct: boolean("correct").notNull(),
    scorePercent: integer("score_percent").notNull(),
    hintCount: integer("hint_count").notNull(),
    modality: text("modality").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull(),
  },
  (table) => [
    unique("activity_attempts_enrollment_operation_unique").on(
      table.enrollmentId,
      table.operationKey,
    ),
    index("activity_attempts_enrollment_activity_idx").on(
      table.enrollmentId,
      table.activityId,
      table.createdAt,
    ),
    check("activity_attempts_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check(
      "activity_attempts_activity_id_not_blank",
      sql`length(btrim(${table.activityId})) > 0`,
    ),
    check(
      "activity_attempts_operation_key_not_blank",
      sql`length(btrim(${table.operationKey})) > 0`,
    ),
    check(
      "activity_attempts_revision_positive",
      sql`${table.contentSchemaVersion} > 0 and ${table.contentRevision} > 0`,
    ),
    check(
      "activity_attempts_evaluation_source_supported",
      sql`${table.evaluationSource} = 'deterministic/rule'`,
    ),
    check(
      "activity_attempts_score_range",
      sql`${table.scorePercent} between 0 and 100`,
    ),
    check("activity_attempts_hint_count_non_negative", sql`${table.hintCount} >= 0`),
    check(
      "activity_attempts_modality_supported",
      sql`${table.modality} in ('reading', 'listening', 'writing', 'speaking', 'mixed')`,
    ),
  ],
);

export const activityProgress = pgTable(
  "activity_progress",
  {
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    activityId: text("activity_id").notNull(),
    attempts: integer("attempts").notNull(),
    correctAttempts: integer("correct_attempts").notNull(),
    lastAttemptAt: timestamp("last_attempt_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "activity_progress_enrollment_activity_pk",
      columns: [table.enrollmentId, table.activityId],
    }),
    check("activity_progress_attempts_positive", sql`${table.attempts} > 0`),
    check(
      "activity_progress_correct_attempts_range",
      sql`${table.correctAttempts} between 0 and ${table.attempts}`,
    ),
  ],
);

export const memoryItems = pgTable(
  "memory_items",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    conceptId: text("concept_id").notNull(),
    sourceActivityId: text("source_activity_id").notNull(),
    dueAt: timestamp("due_at", { mode: "date", withTimezone: true }).notNull(),
    intervalSeconds: integer("interval_seconds").notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    algorithmVersion: text("algorithm_version").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull(),
  },
  (table) => [
    unique("memory_items_enrollment_concept_unique").on(
      table.enrollmentId,
      table.conceptId,
    ),
    index("memory_items_due_queue_idx").on(table.enrollmentId, table.dueAt, table.id),
    check("memory_items_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check("memory_items_concept_id_not_blank", sql`length(btrim(${table.conceptId})) > 0`),
    check(
      "memory_items_source_activity_not_blank",
      sql`length(btrim(${table.sourceActivityId})) > 0`,
    ),
    check("memory_items_interval_non_negative", sql`${table.intervalSeconds} >= 0`),
    check("memory_items_review_count_non_negative", sql`${table.reviewCount} >= 0`),
    check(
      "memory_items_algorithm_version_not_blank",
      sql`length(btrim(${table.algorithmVersion})) > 0`,
    ),
  ],
);

export const reviewEvents = pgTable(
  "review_events",
  {
    id: text("id").primaryKey(),
    memoryItemId: text("memory_item_id")
      .notNull()
      .references(() => memoryItems.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    operationKey: text("operation_key").notNull(),
    grade: text("grade").notNull(),
    correct: boolean("correct").notNull(),
    hintCount: integer("hint_count").notNull(),
    previousDueAt: timestamp("previous_due_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    nextDueAt: timestamp("next_due_at", { mode: "date", withTimezone: true })
      .notNull(),
    intervalSeconds: integer("interval_seconds").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull(),
  },
  (table) => [
    unique("review_events_enrollment_operation_unique").on(
      table.enrollmentId,
      table.operationKey,
    ),
    index("review_events_memory_created_idx").on(table.memoryItemId, table.createdAt),
    check("review_events_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check(
      "review_events_operation_key_not_blank",
      sql`length(btrim(${table.operationKey})) > 0`,
    ),
    check(
      "review_events_grade_supported",
      sql`${table.grade} in ('again', 'hard', 'good', 'easy')`,
    ),
    check("review_events_hint_count_non_negative", sql`${table.hintCount} >= 0`),
    check("review_events_interval_positive", sql`${table.intervalSeconds} > 0`),
    check(
      "review_events_algorithm_version_not_blank",
      sql`length(btrim(${table.algorithmVersion})) > 0`,
    ),
  ],
);

export const conceptEvidence = pgTable(
  "concept_evidence",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    conceptId: text("concept_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    kind: text("kind").notNull(),
    modality: text("modality").notNull(),
    outcome: text("outcome").notNull(),
    supportLevel: integer("support_level").notNull(),
    occurredAt: timestamp("occurred_at", { mode: "date", withTimezone: true })
      .notNull(),
  },
  (table) => [
    unique("concept_evidence_source_concept_unique").on(
      table.sourceType,
      table.sourceId,
      table.conceptId,
    ),
    index("concept_evidence_enrollment_concept_idx").on(
      table.enrollmentId,
      table.conceptId,
      table.occurredAt,
    ),
    check("concept_evidence_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check(
      "concept_evidence_concept_id_not_blank",
      sql`length(btrim(${table.conceptId})) > 0`,
    ),
    check(
      "concept_evidence_source_type_supported",
      sql`${table.sourceType} in ('attempt', 'review')`,
    ),
    check(
      "concept_evidence_kind_supported",
      sql`${table.kind} in ('guided', 'independent-retrieval', 'delayed-review')`,
    ),
    check(
      "concept_evidence_modality_supported",
      sql`${table.modality} in ('reading', 'listening', 'writing', 'speaking', 'mixed')`,
    ),
    check(
      "concept_evidence_outcome_supported",
      sql`${table.outcome} in ('correct', 'incorrect')`,
    ),
    check("concept_evidence_support_non_negative", sql`${table.supportLevel} >= 0`),
  ],
);

export const masteryStates = pgTable(
  "mastery_states",
  {
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    conceptId: text("concept_id").notNull(),
    scorePercent: integer("score_percent").notNull(),
    confidencePercent: integer("confidence_percent").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "mastery_states_enrollment_concept_pk",
      columns: [table.enrollmentId, table.conceptId],
    }),
    index("mastery_states_weak_idx").on(
      table.enrollmentId,
      table.scorePercent,
      table.confidencePercent,
    ),
    check("mastery_states_score_range", sql`${table.scorePercent} between 0 and 100`),
    check(
      "mastery_states_confidence_range",
      sql`${table.confidencePercent} between 0 and 100`,
    ),
    check(
      "mastery_states_algorithm_version_not_blank",
      sql`length(btrim(${table.algorithmVersion})) > 0`,
    ),
  ],
);
