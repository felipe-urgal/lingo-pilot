import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

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

export const learnerProfiles = pgTable(
  "learner_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    interfaceLocale: text("interface_locale").notNull(),
    timezone: text("timezone").notNull(),
    dailyGoalMinutes: integer("daily_goal_minutes").notNull(),
    primaryGoal: text("primary_goal"),
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
      "learner_profiles_interface_locale_supported",
      sql`${table.interfaceLocale} = 'pt-BR'`,
    ),
    check(
      "learner_profiles_timezone_not_blank",
      sql`length(btrim(${table.timezone})) > 0`,
    ),
    check(
      "learner_profiles_daily_goal_range",
      sql`${table.dailyGoalMinutes} between 5 and 120`,
    ),
    check(
      "learner_profiles_primary_goal_supported",
      sql`${table.primaryGoal} is null or ${table.primaryGoal} in ('conversation', 'travel', 'work', 'study', 'other')`,
    ),
  ],
);

export const languageProfiles = pgTable(
  "language_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceLanguage: text("source_language").notNull(),
    targetLanguage: text("target_language").notNull(),
    startingLevel: text("starting_level").notNull(),
    currentEstimatedLevel: text("current_estimated_level"),
    status: text("status").notNull(),
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
    unique("language_profiles_user_language_unique").on(
      table.userId,
      table.sourceLanguage,
      table.targetLanguage,
    ),
    check(
      "language_profiles_id_not_blank",
      sql`length(btrim(${table.id})) > 0`,
    ),
    check(
      "language_profiles_languages_distinct",
      sql`${table.sourceLanguage} <> ${table.targetLanguage}`,
    ),
    check(
      "language_profiles_starting_level_supported",
      sql`${table.startingLevel} in ('A0', 'A1', 'A2')`,
    ),
    check(
      "language_profiles_estimated_level_supported",
      sql`${table.currentEstimatedLevel} is null or ${table.currentEstimatedLevel} in ('A0', 'A1', 'A2')`,
    ),
    check(
      "language_profiles_status_supported",
      sql`${table.status} = 'active'`,
    ),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    languageProfileId: text("language_profile_id")
      .notNull()
      .references(() => languageProfiles.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    entryPointLevel: text("entry_point_level").notNull(),
    placementSource: text("placement_source").notNull(),
    status: text("status").notNull(),
    enrolledAt: timestamp("enrolled_at", {
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
    unique("enrollments_language_profile_course_unique").on(
      table.languageProfileId,
      table.courseId,
    ),
    check("enrollments_id_not_blank", sql`length(btrim(${table.id})) > 0`),
    check(
      "enrollments_course_id_not_blank",
      sql`length(btrim(${table.courseId})) > 0`,
    ),
    check(
      "enrollments_entry_point_supported",
      sql`${table.entryPointLevel} in ('A0', 'A1', 'A2')`,
    ),
    check(
      "enrollments_placement_source_supported",
      sql`${table.placementSource} in ('zero', 'manual')`,
    ),
    check(
      "enrollments_placement_consistent",
      sql`((${table.entryPointLevel} = 'A0' and ${table.placementSource} = 'zero') or (${table.entryPointLevel} in ('A1', 'A2') and ${table.placementSource} = 'manual'))`,
    ),
    check("enrollments_status_supported", sql`${table.status} = 'active'`),
  ],
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
    check("auth_sessions_id_not_blank", sql`length(btrim(${table.id})) > 0`),
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
