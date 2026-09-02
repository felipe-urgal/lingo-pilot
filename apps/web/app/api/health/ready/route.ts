import { NextRequest, NextResponse } from "next/server";
import { createDatabaseClient } from "../../../../../../packages/db/src/client.ts";
import { errorCodes } from "../../../../server/observability/errors";
import { observeRequest } from "../../../../server/observability/runtime";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/health/ready", useCase: "health.readiness" },
    async ({ logger }) => {
      const databaseUrl = process.env.DATABASE_URL?.trim();
      if (!databaseUrl) {
        logger.warn("readiness.database.unavailable", {
          errorCode: errorCodes.databaseUnavailable,
          result: "error",
        });
        return unavailableResponse();
      }

      const client = createDatabaseClient(databaseUrl, {
        applicationName: "lingo-pilot-readiness",
        maxConnections: 1,
      });

      try {
        const result = await client.pool.query<{ relation: string | null }>(
          "SELECT to_regclass('public.app_metadata')::text AS relation",
        );
        return result.rows[0]?.relation === "app_metadata"
          ? readyResponse()
          : unavailableResponse();
      } catch (error) {
        logger.warn("readiness.database.unavailable", {
          errorCode: errorCodes.databaseUnavailable,
          errorName: error instanceof Error ? error.name : "UnknownError",
          result: "error",
        });
        return unavailableResponse();
      } finally {
        await client.close();
      }
    },
  );
}

function readyResponse(): NextResponse {
  return NextResponse.json(
    { status: "ready" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

function unavailableResponse(): NextResponse {
  return NextResponse.json(
    { status: "unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
