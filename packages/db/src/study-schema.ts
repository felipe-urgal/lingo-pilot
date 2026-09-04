import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { enrollments } from "./schema.ts";

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    contentSchemaVersion: integer("content_schema_version").notNull(),
    contentRevision: integer("content_revision").notNull(),
    status: text("status").notNull(),
    currentBlockIndex: integer("current_block_index").notNull().default(0),
    startedAt: timestamp("started_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    unique("lesson_progress_enrollment_lesson_unique").on(
      table.enrollmentId,
      table.lessonId,
    ),
    check(
      "lesson_progress_lesson_id_not_blank",
      sql`length(btrim(${table.lessonId})) > 0`,
    ),
    check(
      "lesson_progress_content_revision_positive",
      sql`${table.contentSchemaVersion} > 0 and ${table.contentRevision} > 0`,
    ),
    check(
      "lesson_progress_status_supported",
      sql`${table.status} in ('in_progress', 'completed')`,
    ),
    check(
      "lesson_progress_block_index_non_negative",
      sql`${table.currentBlockIndex} >= 0`,
    ),
    check(
      "lesson_progress_completion_consistent",
      sql`(${table.status} = 'completed' and ${table.completedAt} is not null) or (${table.status} = 'in_progress' and ${table.completedAt} is null)`,
    ),
  ],
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    localStudyDate: text("local_study_date").notNull(),
    plannerVersion: text("planner_version").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    startedAt: timestamp("started_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    unique("study_sessions_enrollment_local_date_unique").on(
      table.enrollmentId,
      table.localStudyDate,
    ),
    check("study_sessions_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check(
      "study_sessions_local_date_iso",
      sql`${table.localStudyDate} ~ '^\\d{4}-\\d{2}-\\d{2}$'`,
    ),
    check(
      "study_sessions_planner_version_not_blank",
      sql`length(btrim(${table.plannerVersion})) > 0`,
    ),
    check(
      "study_sessions_status_supported",
      sql`${table.status} in ('planned', 'in_progress', 'completed', 'abandoned')`,
    ),
  ],
);

export const sessionItems = pgTable(
  "session_items",
  {
    id: text("id").primaryKey(),
    studySessionId: text("study_session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind").notNull(),
    resourceId: text("resource_id").notNull(),
    contentSchemaVersion: integer("content_schema_version").notNull(),
    contentRevision: integer("content_revision").notNull(),
    reasonCode: text("reason_code").notNull(),
    eligibilityReason: text("eligibility_reason").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    unique("session_items_session_position_unique").on(
      table.studySessionId,
      table.position,
    ),
    unique("session_items_session_resource_unique").on(
      table.studySessionId,
      table.kind,
      table.resourceId,
    ),
    check("session_items_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check("session_items_position_non_negative", sql`${table.position} >= 0`),
    check(
      "session_items_kind_supported",
      sql`${table.kind} in ('lesson', 'review')`,
    ),
    check(
      "session_items_resource_id_not_blank",
      sql`length(btrim(${table.resourceId})) > 0`,
    ),
    check(
      "session_items_content_revision_positive",
      sql`${table.contentSchemaVersion} > 0 and ${table.contentRevision} > 0`,
    ),
    check(
      "session_items_reason_supported",
      sql`${table.reasonCode} in ('NEW_ELIGIBLE_LESSON', 'RESUME_IN_PROGRESS', 'OVERDUE_REVIEW', 'WEAK_CONCEPT')`,
    ),
    check(
      "session_items_eligibility_reason_supported",
      sql`${table.eligibilityReason} in ('progress-satisfied', 'placement-waived', 'resume-in-progress', 'not-applicable')`,
    ),
    check(
      "session_items_estimated_minutes_positive",
      sql`${table.estimatedMinutes} > 0`,
    ),
    check(
      "session_items_status_supported",
      sql`${table.status} in ('planned', 'in_progress', 'completed')`,
    ),
  ],
);
