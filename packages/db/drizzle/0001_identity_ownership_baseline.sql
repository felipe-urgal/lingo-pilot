CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_id_not_blank" CHECK (length(btrim("users"."id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "auth_credentials" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_credentials_email_unique" UNIQUE("email"),
	CONSTRAINT "auth_credentials_email_not_blank" CHECK (length(btrim("auth_credentials"."email")) > 0),
	CONSTRAINT "auth_credentials_email_canonical" CHECK ("auth_credentials"."email" = lower(btrim("auth_credentials"."email"))),
	CONSTRAINT "auth_credentials_password_hash_not_blank" CHECK (length(btrim("auth_credentials"."password_hash")) > 0)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_sessions_id_not_blank" CHECK (length(btrim("auth_sessions"."id")) > 0),
	CONSTRAINT "auth_sessions_token_hash_not_blank" CHECK (length(btrim("auth_sessions"."token_hash")) > 0)
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
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ownership_fixtures" ADD CONSTRAINT "ownership_fixtures_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
