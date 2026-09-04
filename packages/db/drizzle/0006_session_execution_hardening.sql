ALTER TABLE "session_items" DROP CONSTRAINT "session_items_status_supported";
--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_status_supported" CHECK ("session_items"."status" in ('planned', 'in_progress', 'completed', 'skipped'));
