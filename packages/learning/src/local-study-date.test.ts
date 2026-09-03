import { describe, expect, it } from "vitest";
import { localStudyDate } from "./local-study-date.ts";

describe("localStudyDate", () => {
  it("uses the learner timezone across a UTC day boundary", () => {
    const now = new Date("2026-01-01T02:30:00.000Z");

    expect(localStudyDate(now, "America/Sao_Paulo")).toBe("2025-12-31");
    expect(localStudyDate(now, "UTC")).toBe("2026-01-01");
  });
});
