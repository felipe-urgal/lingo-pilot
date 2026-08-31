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
