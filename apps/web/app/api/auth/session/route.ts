import { NextRequest, NextResponse } from "next/server";
import {
  resolveRequestUser,
  unauthorizedResponse,
} from "../../../../server/auth/http";
import { observeRequest } from "../../../../server/observability/runtime";

export function GET(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/auth/session", useCase: "auth.resolve-session" },
    async ({ requestId }) => {
      const user = await resolveRequestUser(request);

      if (!user) {
        return unauthorizedResponse(requestId);
      }

      return NextResponse.json({ userId: user.id });
    },
  );
}
