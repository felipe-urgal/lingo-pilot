import { and, eq } from "drizzle-orm";
import type { Database } from "./client.ts";
import { ownershipFixtures, users } from "./schema.ts";

export type UserRecord = typeof users.$inferSelect;
export type OwnershipFixtureRecord = typeof ownershipFixtures.$inferSelect;

export interface CreateOwnershipFixtureInput {
  readonly id: string;
  readonly ownerId: string;
  readonly value: string;
}

export async function createUser(
  database: Database,
  id: string,
): Promise<UserRecord> {
  const [user] = await database.insert(users).values({ id }).returning();

  if (!user) {
    throw new Error("Failed to persist user");
  }

  return user;
}

export async function createOwnershipFixture(
  database: Database,
  input: CreateOwnershipFixtureInput,
): Promise<OwnershipFixtureRecord> {
  const [resource] = await database
    .insert(ownershipFixtures)
    .values(input)
    .returning();

  if (!resource) {
    throw new Error("Failed to persist ownership fixture");
  }

  return resource;
}

export async function findOwnershipFixtureForUser(
  database: Database,
  userId: string,
  resourceId: string,
): Promise<OwnershipFixtureRecord | null> {
  const [resource] = await database
    .select()
    .from(ownershipFixtures)
    .where(
      and(
        eq(ownershipFixtures.id, resourceId),
        eq(ownershipFixtures.ownerId, userId),
      ),
    )
    .limit(1);

  return resource ?? null;
}

export async function updateOwnershipFixtureForUser(
  database: Database,
  userId: string,
  resourceId: string,
  value: string,
): Promise<OwnershipFixtureRecord | null> {
  const [resource] = await database
    .update(ownershipFixtures)
    .set({ updatedAt: new Date(), value })
    .where(
      and(
        eq(ownershipFixtures.id, resourceId),
        eq(ownershipFixtures.ownerId, userId),
      ),
    )
    .returning();

  return resource ?? null;
}
