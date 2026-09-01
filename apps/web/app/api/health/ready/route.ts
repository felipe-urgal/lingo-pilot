import { NextResponse } from "next/server";
import { createDatabaseClient } from "../../../../../../packages/db/src/index.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const client = createDatabaseClient(databaseUrl, {
    applicationName: "lingo-pilot-readiness",
    maxConnections: 1,
  });

  try {
    const result = await client.pool.query<{ relation: string | null }>(
      "SELECT to_regclass('public.app_metadata')::text AS relation",
    );
    const isReady = result.rows[0]?.relation === "app_metadata";

    return NextResponse.json(
      { status: isReady ? "ready" : "unavailable" },
      {
        status: isReady ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await client.close();
  }
}
