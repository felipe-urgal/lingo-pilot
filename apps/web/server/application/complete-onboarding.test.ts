import { describe, expect, it } from "vitest";
import type {
  LearnerJourney,
  LearnerJourneyRepository,
  SaveInitialLearnerJourneyInput,
} from "../../../../packages/domain/src/index.ts";
import { createCompleteOnboarding } from "./complete-onboarding.ts";

class JourneyRepositoryFake implements LearnerJourneyRepository {
  saved: SaveInitialLearnerJourneyInput | null = null;

  async findForUser(): Promise<LearnerJourney | null> {
    return null;
  }

  async saveInitial(
    input: SaveInitialLearnerJourneyInput,
  ): Promise<LearnerJourney> {
    this.saved = input;
    return {
      learnerProfile: {
        ...input.learnerProfile,
        createdAt: input.now,
        updatedAt: input.now,
      },
      languageProfile: {
        ...input.languageProfile,
        createdAt: input.now,
        updatedAt: input.now,
      },
      enrollment: {
        ...input.enrollment,
        languageProfileId: input.languageProfile.id,
        enrolledAt: input.now,
        updatedAt: input.now,
      },
    };
  }
}

function dependencies(repository: JourneyRepositoryFake) {
  let nextId = 0;
  return {
    clock: { now: () => new Date("2026-09-02T18:00:00.000Z") },
    idGenerator: { generate: () => `generated-${++nextId}` },
    journeys: repository,
  };
}

describe("complete onboarding", () => {
  it("persists A0 as zero placement without fabricated mastery data", async () => {
    const repository = new JourneyRepositoryFake();
    const execute = createCompleteOnboarding(dependencies(repository));

    const result = await execute({
      userId: "user-1",
      interfaceLocale: "pt-BR",
      timezone: "America/Sao_Paulo",
      dailyGoalMinutes: "20",
      primaryGoal: "conversation",
      entryPointLevel: "A0",
    });

    expect(result.ok).toBe(true);
    expect(repository.saved?.enrollment).toEqual({
      id: "generated-2",
      courseId: "course.en.ptbr.v1",
      entryPointLevel: "A0",
      placementSource: "zero",
      status: "active",
    });
    expect(repository.saved).not.toHaveProperty("attempt");
    expect(repository.saved).not.toHaveProperty("reviewEvent");
    expect(repository.saved).not.toHaveProperty("masteryState");
  });

  it("persists A1/A2 manual placement without treating it as estimated mastery", async () => {
    const repository = new JourneyRepositoryFake();
    const execute = createCompleteOnboarding(dependencies(repository));

    const result = await execute({
      userId: "user-2",
      interfaceLocale: "pt-BR",
      timezone: "Europe/Lisbon",
      dailyGoalMinutes: 15,
      primaryGoal: null,
      entryPointLevel: "A2",
    });

    expect(result.ok).toBe(true);
    expect(repository.saved?.languageProfile.currentEstimatedLevel).toBeNull();
    expect(repository.saved?.enrollment.placementSource).toBe("manual");
    expect(repository.saved?.enrollment.entryPointLevel).toBe("A2");
  });

  it("rejects invalid boundary values before persistence", async () => {
    const repository = new JourneyRepositoryFake();
    const execute = createCompleteOnboarding(dependencies(repository));

    const result = await execute({
      userId: "user-3",
      interfaceLocale: "pt-BR",
      timezone: "Not/A_Timezone",
      dailyGoalMinutes: 0,
      primaryGoal: "unsupported",
      entryPointLevel: "B1",
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "onboarding_invalid_input" },
    });
    expect(repository.saved).toBeNull();
  });
});
