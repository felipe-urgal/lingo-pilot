import { describe, expect, it } from "vitest";
import {
  REVIEW_ALGORITHM_VERSION,
  createReviewSchedulerV1,
  initialReviewSchedule,
  reviewGradeFromResult,
} from "./review-scheduler.ts";

describe("review scheduler v1", () => {
  const now = new Date("2026-09-03T18:00:00.000Z");

  it("is deterministic for the same state, grade and clock", () => {
    const scheduler = createReviewSchedulerV1();
    const state = {
      dueAt: now,
      intervalSeconds: 86_400,
      reviewCount: 2,
    };

    expect(scheduler.schedule(state, "good", now)).toEqual(
      scheduler.schedule(state, "good", now),
    );
    expect(scheduler.schedule(state, "good", now)).toEqual({
      dueAt: new Date("2026-09-05T18:00:00.000Z"),
      intervalSeconds: 172_800,
      algorithmVersion: REVIEW_ALGORITHM_VERSION,
    });
  });

  it("maps incorrect, hinted and independent success to distinct grades", () => {
    expect(
      reviewGradeFromResult({
        correct: false,
        hintCount: 0,
        independent: true,
      }),
    ).toBe("again");
    expect(
      reviewGradeFromResult({ correct: true, hintCount: 1, independent: true }),
    ).toBe("hard");
    expect(
      reviewGradeFromResult({
        correct: true,
        hintCount: 0,
        independent: false,
      }),
    ).toBe("good");
    expect(
      reviewGradeFromResult({ correct: true, hintCount: 0, independent: true }),
    ).toBe("easy");
  });

  it("keeps failed reviews close and expands successful intervals", () => {
    expect(initialReviewSchedule("again", now).intervalSeconds).toBe(600);
    expect(initialReviewSchedule("hard", now).intervalSeconds).toBe(43_200);
    expect(initialReviewSchedule("good", now).intervalSeconds).toBe(86_400);
    expect(initialReviewSchedule("easy", now).intervalSeconds).toBe(259_200);
  });
});
