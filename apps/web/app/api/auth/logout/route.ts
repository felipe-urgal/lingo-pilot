import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../../config/server";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../../../server/auth/cookie";
import { isSameOriginRequest } from "../../../../server/auth/http";
import { authAdapter } from "../../../../server/auth/postgres-adapter";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await authAdapter.revoke(token);
  }

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(serverConfig.profile, 0),
    expires: new Date(0),
  });

  return response;
}
