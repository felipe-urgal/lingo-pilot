import { randomUUID } from "node:crypto";
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
import { hashPassword } from "../../../../server/auth/password";
import { authAdapter } from "../../../../server/auth/postgres-adapter";
import { SESSION_TTL_SECONDS } from "../../../../server/auth/session-token";
import { createAuthAccount, getDatabase } from "../../../../server/database";
import { errorCodes } from "../../../../server/observability/errors";
import { createErrorResponse } from "../../../../server/observability/request";
import { observeRequest } from "../../../../server/observability/runtime";

function signupRedirect(error?: string): NextResponse {
  const url = new URL("/signup", serverConfig.public.appUrl);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/auth/signup", useCase: "auth.signup" },
    async ({ logger, requestId }) => {
      if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
        return createErrorResponse(errorCodes.authForbidden, requestId);
      }

      const formData = await request.formData();
      const email = normalizeEmail(formData.get("email"));
      const password = formData.get("password");

      if (!email || !isValidLoginPassword(password)) {
        logger.info("auth.signup.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
        });
        return signupRedirect("invalid_input");
      }

      const passwordHash = await hashPassword(password);
      const registration = await createAuthAccount(getDatabase(), {
        userId: randomUUID(),
        email,
        passwordHash,
      });

      if (registration === "conflict") {
        logger.info("auth.signup.rejected", {
          errorCode: errorCodes.authAccountUnavailable,
          result: "rejected",
        });
        return signupRedirect("account_unavailable");
      }

      const grant = await authAdapter.authenticate({ email, password });
      if (!grant)
        throw new Error("Newly registered account could not authenticate");

      const response = NextResponse.redirect(
        new URL("/app", serverConfig.public.appUrl),
        303,
      );
      response.cookies.set(SESSION_COOKIE_NAME, grant.token, {
        ...sessionCookieOptions(serverConfig.profile, SESSION_TTL_SECONDS),
        expires: grant.expiresAt,
      });
      return response;
    },
  );
}
