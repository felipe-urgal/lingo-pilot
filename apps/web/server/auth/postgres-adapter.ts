import { randomUUID } from "node:crypto";
import {
  createAuthSession,
  findActiveAuthSessionByTokenHash,
  findAuthCredentialByEmail,
  getDatabase,
  revokeAuthSessionByTokenHash,
  type Database,
} from "../database";
import type {
  AuthAdapter,
  AuthenticatedUser,
  LoginCredentials,
  SessionGrant,
} from "./contracts";
import { isValidLoginPassword, normalizeEmail } from "./credentials";
import { verifyPassword } from "./password";
import {
  createSessionToken,
  hashSessionToken,
  isSessionToken,
  SESSION_TTL_SECONDS,
} from "./session-token";

export class PostgresAuthAdapter implements AuthAdapter {
  constructor(private readonly database: Database = getDatabase()) {}

  async authenticate(
    credentials: LoginCredentials,
    now = new Date(),
  ): Promise<SessionGrant | null> {
    const email = normalizeEmail(credentials.email);

    if (!email || !isValidLoginPassword(credentials.password)) return null;

    const credential = await findAuthCredentialByEmail(this.database, email);

    if (!credential || !(await verifyPassword(credentials.password, credential.passwordHash))) {
      return null;
    }

    const token = createSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    await createAuthSession(this.database, {
      id: randomUUID(),
      userId: credential.userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });

    return { user: { id: credential.userId }, token, expiresAt };
  }

  async resolve(token: string, now = new Date()): Promise<AuthenticatedUser | null> {
    if (!isSessionToken(token)) return null;

    const session = await findActiveAuthSessionByTokenHash(
      this.database,
      hashSessionToken(token),
      now,
    );

    return session ? { id: session.userId } : null;
  }

  async revoke(token: string, now = new Date()): Promise<void> {
    if (!isSessionToken(token)) return;
    await revokeAuthSessionByTokenHash(this.database, hashSessionToken(token), now);
  }
}

export const authAdapter: AuthAdapter = new PostgresAuthAdapter();
