import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "../../../../../config/server";
import { getCurrentUser } from "../../../../../server/auth/current-user";
import { isSameOriginRequest } from "../../../../../server/auth/http";
import { getEnglishCourseCatalog } from "../../../../../server/content/runtime";
import { getLearnerJourneyRepository } from "../../../../../server/learner/runtime";
import { errorCodes } from "../../../../../server/observability/errors";
import { createErrorResponse } from "../../../../../server/observability/request";
import { observeRequest } from "../../../../../server/observability/runtime";
import { getPracticeActivity } from "../../../../../server/practice/activity-catalog";
import { parsePracticeFormAnswer } from "../../../../../server/practice/form-answer";
import { getSubmitActivityAttempt } from "../../../../../server/practice/runtime";

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
  status: string,
): NextResponse {
  const url = new URL(
    `/app/lesson/${encodeURIComponent(lessonId)}`,
    serverConfig.public.appUrl,
  );
  url.searchParams.set("session", sessionId);
  url.searchParams.set("item", itemId);
  url.searchParams.set("practice", status);
  return NextResponse.redirect(url, 303);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/study/activity/submit", useCase: "study.submitActivity" },
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
      const activityId = formValue(formData.get("activityId"));
      const operationKey = formValue(formData.get("operationKey"));
      const activity = getPracticeActivity(
        getEnglishCourseCatalog(),
        activityId,
      );
      const answer = activity
        ? parsePracticeFormAnswer(activity, formData)
        : null;

      if (
        !activity ||
        activity.content.lessonId !== lessonId ||
        answer === null
      ) {
        logger.info("study.activity.submission.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          activityId,
          studyReason: "invalid-input",
        });
        return sessionId && itemId && lessonId
          ? lessonRedirect(lessonId, sessionId, itemId, "error")
          : canonicalRedirect("/app/today?error=unavailable");
      }

      const result = await getSubmitActivityAttempt()({
        journey,
        sessionId,
        sessionItemId: itemId,
        activityId,
        operationKey,
        answer,
        hintCount: formData.get("hintUsed") === "1" ? 1 : 0,
      });

      if (!result.ok) {
        logger.info("study.activity.submission.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          activityId,
          studyReason: result.reason,
        });
        return lessonRedirect(lessonId, sessionId, itemId, "error");
      }

      logger.info("study.activity.submission.completed", {
        result: "success",
        activityId,
        attemptId: result.attemptId,
        correct: result.correct,
        duplicate: result.duplicate,
      });
      return lessonRedirect(
        lessonId,
        sessionId,
        itemId,
        result.correct ? "correct" : "incorrect",
      );
    },
  );
}
