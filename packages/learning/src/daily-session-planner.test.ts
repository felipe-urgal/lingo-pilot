import { describe, expect, it } from "vitest";
import {
  DAILY_SESSION_PLANNER_VERSION,
  planDailySession,
  type DailySessionPlannerInput,
  type PlannerLessonCandidate,
  type PlannerReviewCandidate,
} from "./daily-session-planner.ts";

const now = new Date("2026-09-04T12:00:00.000Z");

function lesson(
  id: string,
  availability: "in_progress" | "available" = "available",
  estimatedMinutes = 8,
  curriculumOrder = 0,
): PlannerLessonCandidate {
  return {
    id,
    schemaVersion: 1,
    revision: 1,
    estimatedMinutes,
    eligibilityReason:
      availability === "in_progress"
        ? "resume-in-progress"
        : "progress-satisfied",
    availability,
    curriculumOrder,
  };
}

function review(
  id: string,
  hoursOverdue: number,
  options: Partial<PlannerReviewCandidate> = {},
): PlannerReviewCandidate {
  return {
    id,
    sourceActivityId: `activity.${id}`,
    conceptId: `concept.${id}`,
    schemaVersion: 1,
    revision: 1,
    dueAt: new Date(now.getTime() - hoursOverdue * 60 * 60 * 1000),
    modality: "reading",
    isWeakConcept: false,
    ...options,
  };
}

function input(
  overrides: Partial<DailySessionPlannerInput> = {},
): DailySessionPlannerInput {
  return {
    plannerVersion: DAILY_SESSION_PLANNER_VERSION,
    now,
    dailyGoalMinutes: 20,
    dueReviewCount: 0,
    lessons: [],
    reviews: [],
    availableModalities: ["reading", "writing", "mixed"],
    ...overrides,
  };
}

describe("DailySessionPlanner v1", () => {
  it("creates a valid first-day plan with new eligible content", () => {
    const plan = planDailySession(input({ lessons: [lesson("lesson.a0.01")] }));

    expect(plan.items).toEqual([
      expect.objectContaining({
        kind: "lesson",
        resourceId: "lesson.a0.01",
        reasonCode: "NEW_ELIGIBLE_LESSON",
      }),
    ]);
    expect(plan.diagnostics.estimatedMinutes).toBe(8);
  });

  it("resumes in-progress content before overdue reviews", () => {
    const plan = planDailySession(
      input({
        dueReviewCount: 2,
        lessons: [lesson("lesson.resume", "in_progress", 6)],
        reviews: [review("review.old", 48)],
      }),
    );

    expect(plan.items.map((item) => item.reasonCode)).toEqual([
      "RESUME_IN_PROGRESS",
      "OVERDUE_REVIEW",
    ]);
  });

  it("prioritizes heavily overdue reviews before weak concepts and new content", () => {
    const plan = planDailySession(
      input({
        dueReviewCount: 2,
        dailyGoalMinutes: 20,
        lessons: [lesson("lesson.new", "available", 8)],
        reviews: [
          review("weak", 2, { isWeakConcept: true }),
          review("old", 72),
        ],
      }),
    );

    expect(plan.items.map((item) => item.reasonCode)).toEqual([
      "OVERDUE_REVIEW",
      "WEAK_CONCEPT",
      "NEW_ELIGIBLE_LESSON",
    ]);
  });

  it("suspends new content under extreme review debt without exceeding the goal", () => {
    const reviews = Array.from({ length: 100 }, (_, index) =>
      review(`review.${String(index).padStart(3, "0")}`, 72 + index),
    );
    const plan = planDailySession(
      input({
        dueReviewCount: 240,
        dailyGoalMinutes: 20,
        lessons: [lesson("lesson.new", "available", 8)],
        reviews,
      }),
    );

    expect(plan.diagnostics.newContentSuspended).toBe(true);
    expect(plan.items.every((item) => item.kind === "review")).toBe(true);
    expect(plan.diagnostics.estimatedMinutes).toBeLessThanOrEqual(20);
    expect(plan.items).toHaveLength(10);
  });

  it("builds a review-only session when no lesson is eligible", () => {
    const plan = planDailySession(
      input({
        dueReviewCount: 1,
        reviews: [review("review.only", 36)],
      }),
    );

    expect(plan.items).toEqual([
      expect.objectContaining({
        kind: "review",
        resourceId: "review.only",
        reasonCode: "OVERDUE_REVIEW",
      }),
    ]);
  });

  it("skips review modalities that are unavailable", () => {
    const plan = planDailySession(
      input({
        dueReviewCount: 2,
        reviews: [
          review("reading", 48),
          review("speaking", 48, { modality: "speaking" }),
        ],
        availableModalities: ["reading"],
      }),
    );

    expect(plan.items.map((item) => item.resourceId)).toEqual(["reading"]);
    expect(plan.diagnostics.unavailableModalityReviewCount).toBe(1);
  });

  it("uses stable due-date and id tie-breakers", () => {
    const sameDueAt = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const plannerInput = input({
      dueReviewCount: 2,
      reviews: [
        review("b", 48, { dueAt: sameDueAt }),
        review("a", 48, { dueAt: sameDueAt }),
      ],
    });

    const first = planDailySession(plannerInput);
    const second = planDailySession(plannerInput);
    expect(first).toEqual(second);
    expect(first.items.map((item) => item.resourceId)).toEqual(["a", "b"]);
  });
});
