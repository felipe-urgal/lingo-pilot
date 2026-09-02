import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../../config/server";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../../../server/auth/cookie";
import {
  isValidLoginPassword,
  normalizeEmail,
} from "../../../../server/auth/credentials";
import { isSameOriginRequest } from "../../../../server/auth/http";
import { authAdapter } from "../../../../server/auth/postgres-adapter";
import { SESSION_TTL_SECONDS } from "../../../../server/auth/session-token";

function loginRedirect(request: NextRequest, error?: string): NextResponse {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");

  if (!email || !isValidLoginPassword(password)) {
    return loginRedirect(request, "invalid_credentials");
  }

  const grant = await authAdapter.authenticate({ email, password });
  if (!grant) return loginRedirect(request, "invalid_credentials");

  const response = NextResponse.redirect(new URL("/app", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, grant.token, {
    ...sessionCookieOptions(serverConfig.profile, SESSION_TTL_SECONDS),
    expires: grant.expiresAt,
  });
  return response;
}
