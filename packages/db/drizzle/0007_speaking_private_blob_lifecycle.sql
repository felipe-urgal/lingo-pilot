CREATE TABLE "speaking_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"session_item_id" text,
	"activity_id" text NOT NULL,
	"content_schema_version" integer NOT NULL,
	"content_revision" integer NOT NULL,
	"operation_key" text NOT NULL,
	"asset_id" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_length" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" text NOT NULL,
	"etag" text,
	"upload_expires_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone,
	"retained_until" timestamp with time zone,
	"discarded_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "speaking_attempts_enrollment_operation_unique" UNIQUE("enrollment_id","operation_key"),
	CONSTRAINT "speaking_attempts_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "speaking_attempts_id_not_blank" CHECK (length(btrim("speaking_attempts"."id")) > 0),
	CONSTRAINT "speaking_attempts_activity_id_not_blank" CHECK (length(btrim("speaking_attempts"."activity_id")) > 0),
	CONSTRAINT "speaking_attempts_operation_key_not_blank" CHECK (length(btrim("speaking_attempts"."operation_key")) > 0),
	CONSTRAINT "speaking_attempts_asset_id_not_blank" CHECK (length(btrim("speaking_attempts"."asset_id")) > 0),
	CONSTRAINT "speaking_attempts_object_key_not_blank" CHECK (length(btrim("speaking_attempts"."object_key")) > 0),
	CONSTRAINT "speaking_attempts_content_revision_positive" CHECK ("speaking_attempts"."content_schema_version" > 0 and "speaking_attempts"."content_revision" > 0),
	CONSTRAINT "speaking_attempts_mime_type_supported" CHECK ("speaking_attempts"."mime_type" in ('audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg;codecs=opus', 'audio/mp4')),
	CONSTRAINT "speaking_attempts_byte_length_range" CHECK ("speaking_attempts"."byte_length" > 0 and "speaking_attempts"."byte_length" <= 5242880),
	CONSTRAINT "speaking_attempts_duration_range" CHECK ("speaking_attempts"."duration_ms" > 0 and "speaking_attempts"."duration_ms" <= 60000),
	CONSTRAINT "speaking_attempts_status_supported" CHECK ("speaking_attempts"."status" in ('reserved', 'uploaded', 'discarded', 'deleted')),
	CONSTRAINT "speaking_attempts_upload_window_after_create" CHECK ("speaking_attempts"."upload_expires_at" > "speaking_attempts"."created_at"),
	CONSTRAINT "speaking_attempts_uploaded_tuple_consistent" CHECK ((("speaking_attempts"."etag" is null and "speaking_attempts"."uploaded_at" is null and "speaking_attempts"."retained_until" is null) or ("speaking_attempts"."etag" is not null and "speaking_attempts"."uploaded_at" is not null and "speaking_attempts"."retained_until" is not null))),
	CONSTRAINT "speaking_attempts_retention_after_upload" CHECK ("speaking_attempts"."retained_until" is null or "speaking_attempts"."retained_until" > "speaking_attempts"."uploaded_at"),
	CONSTRAINT "speaking_attempts_lifecycle_consistent" CHECK ((("speaking_attempts"."status" = 'reserved' and "speaking_attempts"."uploaded_at" is null and "speaking_attempts"."discarded_at" is null and "speaking_attempts"."deleted_at" is null) or ("speaking_attempts"."status" = 'uploaded' and "speaking_attempts"."uploaded_at" is not null and "speaking_attempts"."discarded_at" is null and "speaking_attempts"."deleted_at" is null) or ("speaking_attempts"."status" = 'discarded' and "speaking_attempts"."discarded_at" is not null and "speaking_attempts"."deleted_at" is null) or ("speaking_attempts"."status" = 'deleted' and "speaking_attempts"."deleted_at" is not null)))
);
--> statement-breakpoint
ALTER TABLE "speaking_attempts" ADD CONSTRAINT "speaking_attempts_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "speaking_attempts" ADD CONSTRAINT "speaking_attempts_session_item_id_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."session_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "speaking_attempts_enrollment_activity_idx" ON "speaking_attempts" USING btree ("enrollment_id","activity_id","created_at");
--> statement-breakpoint
CREATE INDEX "speaking_attempts_cleanup_idx" ON "speaking_attempts" USING btree ("status","retained_until","upload_expires_at","updated_at");
