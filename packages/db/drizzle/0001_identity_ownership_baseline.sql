CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_id_not_blank" CHECK (length(btrim("users"."id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "ownership_fixtures" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ownership_fixtures_id_not_blank" CHECK (length(btrim("ownership_fixtures"."id")) > 0)
);
--> statement-breakpoint
ALTER TABLE "ownership_fixtures" ADD CONSTRAINT "ownership_fixtures_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
