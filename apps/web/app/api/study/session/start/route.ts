import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../../../config/server";
import { getCurrentUser } from "../../../../../server/auth/current-user";
import { isSameOriginRequest } from "../../../../../server/auth/http";
import { getLearnerJourneyRepository } from "../../../../../server/learner/runtime";
import { errorCodes } from "../../../../../server/observability/errors";
import { createErrorResponse } from "../../../../../server/observability/request";
import { observeRequest } from "../../../../../server/observability/runtime";
import { getStartLessonPlayer } from "../../../../../server/study/runtime";

function canonicalRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, serverConfig.public.appUrl), 303);
}

function formValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/study/session/start", useCase: "study.startLesson" },
    async ({ logger, requestId }) => {
      if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
        return createErrorResponse(errorCodes.authForbidden, requestId);
      }

      const user = await getCurrentUser();
      if (!user) return canonicalRedirect("/login");

      const journey = await getLearnerJourneyRepository().findForUser(user.id);
      if (!journey) return canonicalRedirect("/app/onboarding");

      const formData = await request.formData();
      const result = await getStartLessonPlayer()({
        journey,
        sessionId: formValue(formData.get("sessionId")),
        itemId: formValue(formData.get("itemId")),
      });

      if (!result.ok) {
        logger.info("study.lesson.start.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          studyReason: result.reason,
        });
        const error =
          result.reason === "revision-conflict"
            ? "content_changed"
            : result.reason === "content-unavailable"
              ? "content_unavailable"
              : result.reason === "lesson-locked"
                ? "lesson_locked"
                : "unavailable";
        return canonicalRedirect(`/app/today?error=${error}`);
      }

      const url = new URL(
        `/app/lesson/${encodeURIComponent(result.lesson.id)}`,
        serverConfig.public.appUrl,
      );
      url.searchParams.set("session", formValue(formData.get("sessionId")));
      url.searchParams.set("item", formValue(formData.get("itemId")));
      return NextResponse.redirect(url, 303);
    },
  );
}
