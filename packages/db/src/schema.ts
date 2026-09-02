import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appMetadata = pgTable(
  "app_metadata",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("app_metadata_key_not_blank", sql`length(btrim(${table.key})) > 0`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [check("users_id_not_blank", sql`length(btrim(${table.id})) > 0`)],
);

export const authCredentials = pgTable(
  "auth_credentials",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "auth_credentials_email_not_blank",
      sql`length(btrim(${table.email})) > 0`,
    ),
    check(
      "auth_credentials_email_canonical",
      sql`${table.email} = lower(btrim(${table.email}))`,
    ),
    check(
      "auth_credentials_password_hash_not_blank",
      sql`length(btrim(${table.passwordHash})) > 0`,
    ),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp("revoked_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "auth_sessions_id_not_blank",
      sql`length(btrim(${table.id})) > 0`,
    ),
    check(
      "auth_sessions_token_hash_not_blank",
      sql`length(btrim(${table.tokenHash})) > 0`,
    ),
  ],
);

export const ownershipFixtures = pgTable(
  "ownership_fixtures",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "ownership_fixtures_id_not_blank",
      sql`length(btrim(${table.id})) > 0`,
    ),
  ],
);
