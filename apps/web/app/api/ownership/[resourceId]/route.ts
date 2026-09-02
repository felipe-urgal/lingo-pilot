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
import { errorCodes } from "../../../../server/observability/errors";
import { createErrorResponse } from "../../../../server/observability/request";
import { observeRequest } from "../../../../server/observability/runtime";

type RouteContext = Readonly<{
  params: Promise<{ resourceId: string }>;
}>;

const MAX_FIXTURE_VALUE_LENGTH = 500;

export function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/ownership/[resourceId]", useCase: "ownership.read" },
    async ({ requestId }) => {
      const user = await resolveRequestUser(request);

      if (!user) {
        return unauthorizedResponse(requestId);
      }

      const { resourceId } = await context.params;
      const resource = await findOwnershipFixtureForUser(
        getDatabase(),
        user.id,
        resourceId,
      );

      if (!resource) {
        return forbiddenResponse(requestId);
      }

      return NextResponse.json({
        id: resource.id,
        value: resource.value,
      });
    },
  );
}

export function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/ownership/[resourceId]", useCase: "ownership.update" },
    async ({ requestId }) => {
      const user = await resolveRequestUser(request);

      if (!user) {
        return unauthorizedResponse(requestId);
      }

      let payload: unknown;

      try {
        payload = await request.json();
      } catch {
        return createErrorResponse(errorCodes.requestInvalidInput, requestId);
      }

      const value =
        typeof payload === "object" &&
        payload !== null &&
        "value" in payload &&
        typeof payload.value === "string"
          ? payload.value
          : null;

      if (
        value === null ||
        value.trim().length === 0 ||
        value.length > MAX_FIXTURE_VALUE_LENGTH
      ) {
        return createErrorResponse(errorCodes.requestInvalidInput, requestId);
      }

      const { resourceId } = await context.params;
      const resource = await updateOwnershipFixtureForUser(
        getDatabase(),
        user.id,
        resourceId,
        value,
      );

      if (!resource) {
        return forbiddenResponse(requestId);
      }

      return NextResponse.json({
        id: resource.id,
        value: resource.value,
      });
    },
  );
}
