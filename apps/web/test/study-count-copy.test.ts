import { describe, expect, it } from "vitest";
import {
  formatCompletedStudySummary,
  formatPlannedReviewsSummary,
} from "../lib/study/study-count-copy";

describe("study count copy", () => {
  it("renders zero reviews with the correct plural", () => {
    expect(formatCompletedStudySummary({ lessons: 1, reviews: 0 })).toBe(
      "1 aula e 0 revisões concluídas a partir dos itens persistidos.",
    );
  });

  it("renders singular counts without plural suffix composition", () => {
    expect(formatCompletedStudySummary({ lessons: 1, reviews: 1 })).toBe(
      "1 aula e 1 revisão concluída a partir dos itens persistidos.",
    );
  });

  it("renders plural lesson and review counts", () => {
    expect(formatCompletedStudySummary({ lessons: 2, reviews: 2 })).toBe(
      "2 aulas e 2 revisões concluídas a partir dos itens persistidos.",
    );
  });

  it("uses the same explicit review pluralization in the active plan", () => {
    expect(formatPlannedReviewsSummary(1)).toBe("1 revisão no plano");
    expect(formatPlannedReviewsSummary(2)).toBe("2 revisões no plano");
  });
});
