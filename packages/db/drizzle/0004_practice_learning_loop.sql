CREATE TABLE "activity_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "enrollment_id" text NOT NULL,
  "session_item_id" text,
  "activity_id" text NOT NULL,
  "content_schema_version" integer NOT NULL,
  "content_revision" integer NOT NULL,
  "operation_key" text NOT NULL,
  "answer" jsonb NOT NULL,
  "evaluation_source" text NOT NULL,
  "correct" boolean NOT NULL,
  "score_percent" integer NOT NULL,
  "hint_count" integer NOT NULL,
  "modality" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "activity_attempts_enrollment_operation_unique" UNIQUE("enrollment_id","operation_key"),
  CONSTRAINT "activity_attempts_id_not_blank" CHECK (length(btrim("id")) > 0),
  CONSTRAINT "activity_attempts_activity_id_not_blank" CHECK (length(btrim("activity_id")) > 0),
  CONSTRAINT "activity_attempts_operation_key_not_blank" CHECK (length(btrim("operation_key")) > 0),
  CONSTRAINT "activity_attempts_revision_positive" CHECK ("content_schema_version" > 0 and "content_revision" > 0),
  CONSTRAINT "activity_attempts_evaluation_source_supported" CHECK ("evaluation_source" = 'deterministic/rule'),
  CONSTRAINT "activity_attempts_score_range" CHECK ("score_percent" between 0 and 100),
  CONSTRAINT "activity_attempts_hint_count_non_negative" CHECK ("hint_count" >= 0),
  CONSTRAINT "activity_attempts_modality_supported" CHECK ("modality" in ('reading', 'listening', 'writing', 'speaking', 'mixed'))
);
--> statement-breakpoint
CREATE TABLE "activity_progress" (
  "enrollment_id" text NOT NULL,
  "activity_id" text NOT NULL,
  "attempts" integer NOT NULL,
  "correct_attempts" integer NOT NULL,
  "last_attempt_at" timestamp with time zone NOT NULL,
  CONSTRAINT "activity_progress_enrollment_activity_pk" PRIMARY KEY("enrollment_id","activity_id"),
  CONSTRAINT "activity_progress_attempts_positive" CHECK ("attempts" > 0),
  CONSTRAINT "activity_progress_correct_attempts_range" CHECK ("correct_attempts" between 0 and "attempts")
);
--> statement-breakpoint
CREATE TABLE "memory_items" (
  "id" text PRIMARY KEY NOT NULL,
  "enrollment_id" text NOT NULL,
  "concept_id" text NOT NULL,
  "source_activity_id" text NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "interval_seconds" integer NOT NULL,
  "review_count" integer DEFAULT 0 NOT NULL,
  "algorithm_version" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "memory_items_enrollment_concept_unique" UNIQUE("enrollment_id","concept_id"),
  CONSTRAINT "memory_items_id_not_blank" CHECK (length(btrim("id")) > 0),
  CONSTRAINT "memory_items_concept_id_not_blank" CHECK (length(btrim("concept_id")) > 0),
  CONSTRAINT "memory_items_source_activity_not_blank" CHECK (length(btrim("source_activity_id")) > 0),
  CONSTRAINT "memory_items_interval_non_negative" CHECK ("interval_seconds" >= 0),
  CONSTRAINT "memory_items_review_count_non_negative" CHECK ("review_count" >= 0),
  CONSTRAINT "memory_items_algorithm_version_not_blank" CHECK (length(btrim("algorithm_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "review_events" (
  "id" text PRIMARY KEY NOT NULL,
  "memory_item_id" text NOT NULL,
  "enrollment_id" text NOT NULL,
  "operation_key" text NOT NULL,
  "grade" text NOT NULL,
  "correct" boolean NOT NULL,
  "hint_count" integer NOT NULL,
  "previous_due_at" timestamp with time zone NOT NULL,
  "next_due_at" timestamp with time zone NOT NULL,
  "interval_seconds" integer NOT NULL,
  "algorithm_version" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "review_events_enrollment_operation_unique" UNIQUE("enrollment_id","operation_key"),
  CONSTRAINT "review_events_id_not_blank" CHECK (length(btrim("id")) > 0),
  CONSTRAINT "review_events_operation_key_not_blank" CHECK (length(btrim("operation_key")) > 0),
  CONSTRAINT "review_events_grade_supported" CHECK ("grade" in ('again', 'hard', 'good', 'easy')),
  CONSTRAINT "review_events_hint_count_non_negative" CHECK ("hint_count" >= 0),
  CONSTRAINT "review_events_interval_positive" CHECK ("interval_seconds" > 0),
  CONSTRAINT "review_events_algorithm_version_not_blank" CHECK (length(btrim("algorithm_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "concept_evidence" (
  "id" text PRIMARY KEY NOT NULL,
  "enrollment_id" text NOT NULL,
  "concept_id" text NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "kind" text NOT NULL,
  "modality" text NOT NULL,
  "outcome" text NOT NULL,
  "support_level" integer NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  CONSTRAINT "concept_evidence_source_concept_unique" UNIQUE("source_type","source_id","concept_id"),
  CONSTRAINT "concept_evidence_id_not_blank" CHECK (length(btrim("id")) > 0),
  CONSTRAINT "concept_evidence_concept_id_not_blank" CHECK (length(btrim("concept_id")) > 0),
  CONSTRAINT "concept_evidence_source_type_supported" CHECK ("source_type" in ('attempt', 'review')),
  CONSTRAINT "concept_evidence_kind_supported" CHECK ("kind" in ('guided', 'independent-retrieval', 'delayed-review')),
  CONSTRAINT "concept_evidence_modality_supported" CHECK ("modality" in ('reading', 'listening', 'writing', 'speaking', 'mixed')),
  CONSTRAINT "concept_evidence_outcome_supported" CHECK ("outcome" in ('correct', 'incorrect')),
  CONSTRAINT "concept_evidence_support_non_negative" CHECK ("support_level" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mastery_states" (
  "enrollment_id" text NOT NULL,
  "concept_id" text NOT NULL,
  "score_percent" integer NOT NULL,
  "confidence_percent" integer NOT NULL,
  "algorithm_version" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "mastery_states_enrollment_concept_pk" PRIMARY KEY("enrollment_id","concept_id"),
  CONSTRAINT "mastery_states_score_range" CHECK ("score_percent" between 0 and 100),
  CONSTRAINT "mastery_states_confidence_range" CHECK ("confidence_percent" between 0 and 100),
  CONSTRAINT "mastery_states_algorithm_version_not_blank" CHECK (length(btrim("algorithm_version")) > 0)
);
--> statement-breakpoint
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_session_item_id_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."session_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_memory_item_id_memory_items_id_fk" FOREIGN KEY ("memory_item_id") REFERENCES "public"."memory_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concept_evidence" ADD CONSTRAINT "concept_evidence_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mastery_states" ADD CONSTRAINT "mastery_states_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_attempts_enrollment_activity_idx" ON "activity_attempts" USING btree ("enrollment_id","activity_id","created_at");
--> statement-breakpoint
CREATE INDEX "memory_items_due_queue_idx" ON "memory_items" USING btree ("enrollment_id","due_at","id");
--> statement-breakpoint
CREATE INDEX "review_events_memory_created_idx" ON "review_events" USING btree ("memory_item_id","created_at");
--> statement-breakpoint
CREATE INDEX "concept_evidence_enrollment_concept_idx" ON "concept_evidence" USING btree ("enrollment_id","concept_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "mastery_states_weak_idx" ON "mastery_states" USING btree ("enrollment_id","score_percent","confidence_percent");
