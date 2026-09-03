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
import { getSubmitReview } from "../../../../../server/practice/runtime";

function canonicalRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, serverConfig.public.appUrl), 303);
}

function formValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function reviewRedirect(status: string): NextResponse {
  const url = new URL("/app/review", serverConfig.public.appUrl);
  url.searchParams.set("result", status);
  return NextResponse.redirect(url, 303);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return observeRequest(
    request,
    { route: "/api/study/review/submit", useCase: "study.submitReview" },
    async ({ logger, requestId }) => {
      if (!isSameOriginRequest(request, serverConfig.public.appUrl)) {
        return createErrorResponse(errorCodes.authForbidden, requestId);
      }

      const user = await getCurrentUser();
      if (!user) return canonicalRedirect("/login");

      const journey = await getLearnerJourneyRepository().findForUser(user.id);
      if (!journey) return canonicalRedirect("/app/onboarding");

      const formData = await request.formData();
      const memoryItemId = formValue(formData.get("memoryItemId"));
      const operationKey = formValue(formData.get("operationKey"));
      const activityId = formValue(formData.get("activityId"));
      const activity = getPracticeActivity(getEnglishCourseCatalog(), activityId);
      const answer = activity ? parsePracticeFormAnswer(activity, formData) : null;
      if (!activity || answer === null) {
        logger.info("study.review.submission.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          activityId,
          studyReason: "invalid-input",
        });
        return reviewRedirect("error");
      }

      const result = await getSubmitReview()({
        journey,
        memoryItemId,
        operationKey,
        answer,
        hintCount: formData.get("hintUsed") === "1" ? 1 : 0,
      });
      if (!result.ok) {
        logger.info("study.review.submission.rejected", {
          errorCode: errorCodes.requestInvalidInput,
          result: "rejected",
          activityId,
          studyReason: result.reason,
        });
        return reviewRedirect(
          result.reason === "stale-review" || result.reason === "not-due"
            ? "stale"
            : "error",
        );
      }

      logger.info("study.review.submission.completed", {
        result: "success",
        activityId,
        reviewEventId: result.reviewEventId,
        correct: result.correct,
        grade: result.grade,
        duplicate: result.duplicate,
        nextDueAt: result.nextDueAt.toISOString(),
      });
      return reviewRedirect(result.correct ? "correct" : "incorrect");
    },
  );
}
