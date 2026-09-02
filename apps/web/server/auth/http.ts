import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AuthenticatedUser } from "./contracts";
import { SESSION_COOKIE_NAME } from "./cookie";
import { authAdapter } from "./postgres-adapter";

export function isSameOriginRequest(
  request: NextRequest,
  expectedOrigin: string,
): boolean {
  return request.headers.get("origin") === expectedOrigin;
}

export async function resolveRequestUser(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return authAdapter.resolve(token);
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
