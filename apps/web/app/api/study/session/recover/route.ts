import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../../../config/server";
import { getCurrentUser } from "../../../../../server/auth/current-user";
import { isSameOriginRequest } from "../../../../../server/auth/http";
import { getLearnerJourneyRepository } from "../../../../../server/learner/runtime";
import { errorCodes } from "../../../../../server/observability/errors";
import { createErrorResponse } from "../../../../../server/observability/request";
import { observeRequest } from "../../../../../server/observability/runtime";
import { getRecoverSessionItem } from "../../../../../server/study/runtime";

function canonicalRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, serverConfig.public.appUrl), 303);
}

function formValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/study/session/recover", useCase: "study.recoverSessionItem" },
    async ({ logger, requestId }) => {
      if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
        return createErrorResponse(errorCodes.authForbidden, requestId);
      }

      const user = await getCurrentUser();
      if (!user) return canonicalRedirect("/login");

      const journey = await getLearnerJourneyRepository().findForUser(user.id);
      if (!journey) return canonicalRedirect("/app/onboarding");

      const formData = await request.formData();
      const result = await getRecoverSessionItem()({
        journey,
        sessionId: formValue(formData.get("sessionId")),
        itemId: formValue(formData.get("itemId")),
      });

      if (!result.ok) {
        logger.info("study.session.recovery.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          studyReason: result.reason,
        });
        return canonicalRedirect("/app/today?error=recovery_unavailable");
      }

      return canonicalRedirect("/app/today");
    },
  );
}
