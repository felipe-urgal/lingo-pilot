import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { enrollments } from "./schema.ts";
import { sessionItems } from "./study-schema.ts";

const maxSpeakingBytes = 5 * 1024 * 1024;
const maxSpeakingDurationMs = 60_000;

export const speakingAttempts = pgTable(
  "speaking_attempts",
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
    assetId: text("asset_id").notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteLength: integer("byte_length").notNull(),
    durationMs: integer("duration_ms").notNull(),
    status: text("status").notNull(),
    etag: text("etag"),
    uploadExpiresAt: timestamp("upload_expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    uploadedAt: timestamp("uploaded_at", {
      mode: "date",
      withTimezone: true,
    }),
    retainedUntil: timestamp("retained_until", {
      mode: "date",
      withTimezone: true,
    }),
    discardedAt: timestamp("discarded_at", {
      mode: "date",
      withTimezone: true,
    }),
    deletedAt: timestamp("deleted_at", {
      mode: "date",
      withTimezone: true,
    }),
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
    unique("speaking_attempts_enrollment_operation_unique").on(
      table.enrollmentId,
      table.operationKey,
    ),
    unique("speaking_attempts_object_key_unique").on(table.objectKey),
    index("speaking_attempts_enrollment_activity_idx").on(
      table.enrollmentId,
      table.activityId,
      table.createdAt,
    ),
    index("speaking_attempts_cleanup_idx").on(
      table.status,
      table.retainedUntil,
      table.uploadExpiresAt,
      table.updatedAt,
    ),
    check("speaking_attempts_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check(
      "speaking_attempts_activity_id_not_blank",
      sql`length(btrim(${table.activityId})) > 0`,
    ),
    check(
      "speaking_attempts_operation_key_not_blank",
      sql`length(btrim(${table.operationKey})) > 0`,
    ),
    check(
      "speaking_attempts_asset_id_not_blank",
      sql`length(btrim(${table.assetId})) > 0`,
    ),
    check(
      "speaking_attempts_object_key_not_blank",
      sql`length(btrim(${table.objectKey})) > 0`,
    ),
    check(
      "speaking_attempts_content_revision_positive",
      sql`${table.contentSchemaVersion} > 0 and ${table.contentRevision} > 0`,
    ),
    check(
      "speaking_attempts_mime_type_supported",
      sql`${table.mimeType} in ('audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg;codecs=opus', 'audio/mp4')`,
    ),
    check(
      "speaking_attempts_byte_length_range",
      sql`${table.byteLength} > 0 and ${table.byteLength} <= ${maxSpeakingBytes}`,
    ),
    check(
      "speaking_attempts_duration_range",
      sql`${table.durationMs} > 0 and ${table.durationMs} <= ${maxSpeakingDurationMs}`,
    ),
    check(
      "speaking_attempts_status_supported",
      sql`${table.status} in ('reserved', 'uploaded', 'discarded', 'deleted')`,
    ),
    check(
      "speaking_attempts_upload_window_after_create",
      sql`${table.uploadExpiresAt} > ${table.createdAt}`,
    ),
    check(
      "speaking_attempts_uploaded_tuple_consistent",
      sql`((${table.etag} is null and ${table.uploadedAt} is null and ${table.retainedUntil} is null) or (${table.etag} is not null and ${table.uploadedAt} is not null and ${table.retainedUntil} is not null))`,
    ),
    check(
      "speaking_attempts_retention_after_upload",
      sql`${table.retainedUntil} is null or ${table.retainedUntil} > ${table.uploadedAt}`,
    ),
    check(
      "speaking_attempts_lifecycle_consistent",
      sql`(
        (${table.status} = 'reserved' and ${table.uploadedAt} is null and ${table.discardedAt} is null and ${table.deletedAt} is null)
        or (${table.status} = 'uploaded' and ${table.uploadedAt} is not null and ${table.discardedAt} is null and ${table.deletedAt} is null)
        or (${table.status} = 'discarded' and ${table.discardedAt} is not null and ${table.deletedAt} is null)
        or (${table.status} = 'deleted' and ${table.deletedAt} is not null)
      )`,
    ),
  ],
);
