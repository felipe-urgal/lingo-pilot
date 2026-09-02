import { NextRequest, NextResponse } from "next/server";
import { observeRequest } from "../../../../server/observability/runtime";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/health/live", useCase: "health.liveness" },
    () =>
      NextResponse.json(
        { status: "ok" },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      ),
  );
}
