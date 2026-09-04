ALTER TABLE "session_items" DROP CONSTRAINT "session_items_kind_supported";
--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_kind_supported" CHECK ("kind" in ('lesson', 'review'));
--> statement-breakpoint
ALTER TABLE "session_items" DROP CONSTRAINT "session_items_reason_supported";
--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_reason_supported" CHECK ("reason_code" in ('NEW_ELIGIBLE_LESSON', 'RESUME_IN_PROGRESS', 'OVERDUE_REVIEW', 'WEAK_CONCEPT'));
--> statement-breakpoint
ALTER TABLE "session_items" DROP CONSTRAINT "session_items_eligibility_reason_supported";
--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_eligibility_reason_supported" CHECK ("eligibility_reason" in ('progress-satisfied', 'placement-waived', 'resume-in-progress', 'not-applicable'));
