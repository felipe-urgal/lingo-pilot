CREATE TABLE "app_metadata" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_metadata_key_not_blank" CHECK (length(btrim("app_metadata"."key")) > 0)
);
