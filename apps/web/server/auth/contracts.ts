export interface AuthenticatedUser {
  readonly id: string;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface SessionGrant {
  readonly user: AuthenticatedUser;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface AuthAdapter {
  authenticate(
    credentials: LoginCredentials,
    now?: Date,
  ): Promise<SessionGrant | null>;
  resolve(token: string, now?: Date): Promise<AuthenticatedUser | null>;
  revoke(token: string, now?: Date): Promise<void>;
}
