CREATE TABLE "learner_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"interface_locale" text NOT NULL,
	"timezone" text NOT NULL,
	"daily_goal_minutes" integer NOT NULL,
	"primary_goal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_profiles_interface_locale_supported" CHECK ("learner_profiles"."interface_locale" = 'pt-BR'),
	CONSTRAINT "learner_profiles_timezone_not_blank" CHECK (length(btrim("learner_profiles"."timezone")) > 0),
	CONSTRAINT "learner_profiles_daily_goal_range" CHECK ("learner_profiles"."daily_goal_minutes" between 5 and 120),
	CONSTRAINT "learner_profiles_primary_goal_supported" CHECK ("learner_profiles"."primary_goal" is null or "learner_profiles"."primary_goal" in ('conversation', 'travel', 'work', 'study', 'other'))
);
--> statement-breakpoint
CREATE TABLE "language_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"starting_level" text NOT NULL,
	"current_estimated_level" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "language_profiles_user_language_unique" UNIQUE("user_id","source_language","target_language"),
	CONSTRAINT "language_profiles_id_not_blank" CHECK (length(btrim("language_profiles"."id")) > 0),
	CONSTRAINT "language_profiles_languages_distinct" CHECK ("language_profiles"."source_language" <> "language_profiles"."target_language"),
	CONSTRAINT "language_profiles_starting_level_supported" CHECK ("language_profiles"."starting_level" in ('A0', 'A1', 'A2')),
	CONSTRAINT "language_profiles_estimated_level_supported" CHECK ("language_profiles"."current_estimated_level" is null or "language_profiles"."current_estimated_level" in ('A0', 'A1', 'A2')),
	CONSTRAINT "language_profiles_status_supported" CHECK ("language_profiles"."status" = 'active')
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"language_profile_id" text NOT NULL,
	"course_id" text NOT NULL,
	"entry_point_level" text NOT NULL,
	"placement_source" text NOT NULL,
	"status" text NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_language_profile_course_unique" UNIQUE("language_profile_id","course_id"),
	CONSTRAINT "enrollments_id_not_blank" CHECK (length(btrim("enrollments"."id")) > 0),
	CONSTRAINT "enrollments_course_id_not_blank" CHECK (length(btrim("enrollments"."course_id")) > 0),
	CONSTRAINT "enrollments_entry_point_supported" CHECK ("enrollments"."entry_point_level" in ('A0', 'A1', 'A2')),
	CONSTRAINT "enrollments_placement_source_supported" CHECK ("enrollments"."placement_source" in ('zero', 'manual')),
	CONSTRAINT "enrollments_placement_consistent" CHECK ((("enrollments"."entry_point_level" = 'A0' and "enrollments"."placement_source" = 'zero') or ("enrollments"."entry_point_level" in ('A1', 'A2') and "enrollments"."placement_source" = 'manual'))),
	CONSTRAINT "enrollments_status_supported" CHECK ("enrollments"."status" = 'active')
);
--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "language_profiles" ADD CONSTRAINT "language_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_language_profile_id_language_profiles_id_fk" FOREIGN KEY ("language_profile_id") REFERENCES "public"."language_profiles"("id") ON DELETE cascade ON UPDATE no action;
