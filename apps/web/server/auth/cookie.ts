import type { RuntimeProfile } from "@lingo-pilot/config/runtime/environment";

export const SESSION_COOKIE_NAME = "lingo_session";

export interface SessionCookieOptions {
  readonly httpOnly: true;
  readonly sameSite: "lax";
  readonly secure: boolean;
  readonly path: "/";
  readonly maxAge: number;
}

export function sessionCookieOptions(profile: RuntimeProfile, maxAge: number): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: profile === "production",
    path: "/",
    maxAge,
  };
}
