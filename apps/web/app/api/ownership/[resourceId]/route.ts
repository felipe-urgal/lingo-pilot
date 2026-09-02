import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  resolveRequestUser,
  unauthorizedResponse,
} from "../../../../server/auth/http";
import {
  findOwnershipFixtureForUser,
  getDatabase,
  updateOwnershipFixtureForUser,
} from "../../../../server/database";

type RouteContext = Readonly<{
  params: Promise<{ resourceId: string }>;
}>;

const MAX_FIXTURE_VALUE_LENGTH = 500;

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const user = await resolveRequestUser(request);
  if (!user) return unauthorizedResponse();

  const { resourceId } = await context.params;
  const resource = await findOwnershipFixtureForUser(getDatabase(), user.id, resourceId);
  if (!resource) return forbiddenResponse();

  return NextResponse.json({ id: resource.id, value: resource.value });
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const user = await resolveRequestUser(request);
  if (!user) return unauthorizedResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const value =
    typeof payload === "object" &&
    payload !== null &&
    "value" in payload &&
    typeof payload.value === "string"
      ? payload.value
      : null;

  if (value === null || value.trim().length === 0 || value.length > MAX_FIXTURE_VALUE_LENGTH) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { resourceId } = await context.params;
  const resource = await updateOwnershipFixtureForUser(getDatabase(), user.id, resourceId, value);
  if (!resource) return forbiddenResponse();

  return NextResponse.json({ id: resource.id, value: resource.value });
}
