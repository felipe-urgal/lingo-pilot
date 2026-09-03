CREATE TABLE "lesson_progress" (
	"enrollment_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"content_schema_version" integer NOT NULL,
	"content_revision" integer NOT NULL,
	"status" text NOT NULL,
	"current_block_index" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lesson_progress_enrollment_lesson_unique" UNIQUE("enrollment_id","lesson_id"),
	CONSTRAINT "lesson_progress_lesson_id_not_blank" CHECK (length(btrim("lesson_progress"."lesson_id")) > 0),
	CONSTRAINT "lesson_progress_content_revision_positive" CHECK ("lesson_progress"."content_schema_version" > 0 and "lesson_progress"."content_revision" > 0),
	CONSTRAINT "lesson_progress_status_supported" CHECK ("lesson_progress"."status" in ('in_progress', 'completed')),
	CONSTRAINT "lesson_progress_block_index_non_negative" CHECK ("lesson_progress"."current_block_index" >= 0),
	CONSTRAINT "lesson_progress_completion_consistent" CHECK (("lesson_progress"."status" = 'completed' and "lesson_progress"."completed_at" is not null) or ("lesson_progress"."status" = 'in_progress' and "lesson_progress"."completed_at" is null))
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"local_study_date" text NOT NULL,
	"planner_version" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "study_sessions_enrollment_local_date_unique" UNIQUE("enrollment_id","local_study_date"),
	CONSTRAINT "study_sessions_id_not_blank" CHECK (length(btrim("study_sessions"."id")) > 0),
	CONSTRAINT "study_sessions_local_date_iso" CHECK ("study_sessions"."local_study_date" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "study_sessions_planner_version_not_blank" CHECK (length(btrim("study_sessions"."planner_version")) > 0),
	CONSTRAINT "study_sessions_status_supported" CHECK ("study_sessions"."status" in ('planned', 'in_progress', 'completed', 'abandoned'))
);
--> statement-breakpoint
CREATE TABLE "session_items" (
	"id" text PRIMARY KEY NOT NULL,
	"study_session_id" text NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"resource_id" text NOT NULL,
	"content_schema_version" integer NOT NULL,
	"content_revision" integer NOT NULL,
	"reason_code" text NOT NULL,
	"eligibility_reason" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "session_items_session_position_unique" UNIQUE("study_session_id","position"),
	CONSTRAINT "session_items_session_resource_unique" UNIQUE("study_session_id","kind","resource_id"),
	CONSTRAINT "session_items_id_not_blank" CHECK (length(btrim("session_items"."id")) > 0),
	CONSTRAINT "session_items_position_non_negative" CHECK ("session_items"."position" >= 0),
	CONSTRAINT "session_items_kind_supported" CHECK ("session_items"."kind" = 'lesson'),
	CONSTRAINT "session_items_resource_id_not_blank" CHECK (length(btrim("session_items"."resource_id")) > 0),
	CONSTRAINT "session_items_content_revision_positive" CHECK ("session_items"."content_schema_version" > 0 and "session_items"."content_revision" > 0),
	CONSTRAINT "session_items_reason_supported" CHECK ("session_items"."reason_code" in ('NEW_ELIGIBLE_LESSON', 'RESUME_IN_PROGRESS')),
	CONSTRAINT "session_items_eligibility_reason_supported" CHECK ("session_items"."eligibility_reason" in ('progress-satisfied', 'placement-waived', 'resume-in-progress')),
	CONSTRAINT "session_items_estimated_minutes_positive" CHECK ("session_items"."estimated_minutes" > 0),
	CONSTRAINT "session_items_status_supported" CHECK ("session_items"."status" in ('planned', 'in_progress', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;
