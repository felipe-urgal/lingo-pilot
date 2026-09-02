import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../config/server";
import { getCurrentUser } from "../../../server/auth/current-user";
import { isSameOriginRequest } from "../../../server/auth/http";
import { getCompleteOnboarding } from "../../../server/learner/runtime";
import { errorCodes } from "../../../server/observability/errors";
import { createErrorResponse } from "../../../server/observability/request";
import { observeRequest } from "../../../server/observability/runtime";

function onboardingRedirect(error?: string): NextResponse {
  const url = new URL("/app/onboarding", serverConfig.public.appUrl);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/onboarding", useCase: "learner.completeOnboarding" },
    async ({ logger, requestId }) => {
      if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
        return createErrorResponse(errorCodes.authForbidden, requestId);
      }

      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.redirect(
          new URL("/login", serverConfig.public.appUrl),
          303,
        );
      }

      const formData = await request.formData();
      const result = await getCompleteOnboarding()({
        userId: user.id,
        interfaceLocale: formData.get("interfaceLocale"),
        timezone: formData.get("timezone"),
        dailyGoalMinutes: formData.get("dailyGoalMinutes"),
        primaryGoal: formData.get("primaryGoal"),
        entryPointLevel: formData.get("entryPointLevel"),
      });

      if (!result.ok) {
        logger.info("learner.onboarding.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
        });
        return onboardingRedirect("invalid_input");
      }

      logger.info("learner.onboarding.completed", {
        entryPointLevel: result.value.enrollment.entryPointLevel,
        placementSource: result.value.enrollment.placementSource,
        primaryGoal: result.value.learnerProfile.primaryGoal ?? "none",
        result: "completed",
      });
      return NextResponse.redirect(
        new URL("/app/today", serverConfig.public.appUrl),
        303,
      );
    },
  );
}
