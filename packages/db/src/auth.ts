import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "./client.ts";
import { authCredentials, authSessions } from "./schema.ts";

export type AuthCredentialRecord = typeof authCredentials.$inferSelect;
export type AuthSessionRecord = typeof authSessions.$inferSelect;

export interface CreateAuthCredentialInput {
  readonly userId: string;
  readonly email: string;
  readonly passwordHash: string;
}

export interface CreateAuthSessionInput {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export async function createAuthCredential(
  database: Database,
  input: CreateAuthCredentialInput,
): Promise<AuthCredentialRecord> {
  const [credential] = await database
    .insert(authCredentials)
    .values(input)
    .returning();

  if (!credential) {
    throw new Error("Failed to persist auth credential");
  }

  return credential;
}

export async function findAuthCredentialByEmail(
  database: Database,
  email: string,
): Promise<AuthCredentialRecord | null> {
  const [credential] = await database
    .select()
    .from(authCredentials)
    .where(eq(authCredentials.email, email))
    .limit(1);

  return credential ?? null;
}

export async function createAuthSession(
  database: Database,
  input: CreateAuthSessionInput,
): Promise<AuthSessionRecord> {
  const [session] = await database
    .insert(authSessions)
    .values(input)
    .returning();

  if (!session) {
    throw new Error("Failed to persist auth session");
  }

  return session;
}

export async function findActiveAuthSessionByTokenHash(
  database: Database,
  tokenHash: string,
  now: Date,
): Promise<AuthSessionRecord | null> {
  const [session] = await database
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
      ),
    )
    .limit(1);

  return session ?? null;
}

export async function revokeAuthSessionByTokenHash(
  database: Database,
  tokenHash: string,
  revokedAt: Date,
): Promise<boolean> {
  const revoked = await database
    .update(authSessions)
    .set({ revokedAt })
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        isNull(authSessions.revokedAt),
      ),
    )
    .returning({ id: authSessions.id });

  return revoked.length > 0;
}
