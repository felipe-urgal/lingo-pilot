import { NextRequest, NextResponse } from "next/server";
import {
  resolveRequestUser,
  unauthorizedResponse,
} from "../../../../server/auth/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await resolveRequestUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  return NextResponse.json({ userId: user.id });
}
