import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../../../config/server";
import { getCurrentUser } from "../../../../../server/auth/current-user";
import { isSameOriginRequest } from "../../../../../server/auth/http";
import { getLearnerJourneyRepository } from "../../../../../server/learner/runtime";
import { errorCodes } from "../../../../../server/observability/errors";
import { createErrorResponse } from "../../../../../server/observability/request";
import { observeRequest } from "../../../../../server/observability/runtime";
import { getNavigateLessonPlayer } from "../../../../../server/study/runtime";

function canonicalRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, serverConfig.public.appUrl), 303);
}

function formValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function lessonRedirect(
  lessonId: string,
  sessionId: string,
  itemId: string,
): NextResponse {
  const url = new URL(
    `/app/lesson/${encodeURIComponent(lessonId)}`,
    serverConfig.public.appUrl,
  );
  url.searchParams.set("session", sessionId);
  url.searchParams.set("item", itemId);
  return NextResponse.redirect(url, 303);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/study/lesson/navigate", useCase: "study.navigateLesson" },
    async ({ logger, requestId }) => {
      if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
        return createErrorResponse(errorCodes.authForbidden, requestId);
      }

      const user = await getCurrentUser();
      if (!user) return canonicalRedirect("/login");

      const journey = await getLearnerJourneyRepository().findForUser(user.id);
      if (!journey) return canonicalRedirect("/app/onboarding");

      const formData = await request.formData();
      const sessionId = formValue(formData.get("sessionId"));
      const itemId = formValue(formData.get("itemId"));
      const lessonId = formValue(formData.get("lessonId"));
      const result = await getNavigateLessonPlayer()({
        journey,
        sessionId,
        itemId,
        lessonId,
        action: formData.get("action"),
        expectedBlockIndex: formData.get("expectedBlockIndex"),
      });

      if (!result.ok) {
        logger.info("study.lesson.navigation.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          studyReason: result.reason,
        });
        if (
          result.reason === "revision-conflict" ||
          result.reason === "content-unavailable" ||
          result.reason === "invalid-position"
        ) {
          return lessonRedirect(lessonId, sessionId, itemId);
        }
        if (result.reason === "invalid-state") {
          return lessonRedirect(lessonId, sessionId, itemId);
        }
        return canonicalRedirect("/app/today?error=unavailable");
      }

      return result.completed
        ? canonicalRedirect("/app/today")
        : lessonRedirect(lessonId, sessionId, itemId);
    },
  );
}
