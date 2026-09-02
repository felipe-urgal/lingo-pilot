import {
  err,
  ok,
  primaryGoals,
  type ApplicationError,
  type Clock,
  type EntryPointLevel,
  type IdGenerator,
  type LearnerJourney,
  type LearnerJourneyRepository,
  type PrimaryGoal,
  type Result,
} from "../../../../packages/domain/src/index.ts";

export const DEFAULT_ENGLISH_COURSE_ID = "course.en.ptbr.v1";

export interface CompleteOnboardingDependencies {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly journeys: LearnerJourneyRepository;
}

export interface CompleteOnboardingInput {
  readonly userId: string;
  readonly interfaceLocale: unknown;
  readonly timezone: unknown;
  readonly dailyGoalMinutes: unknown;
  readonly primaryGoal: unknown;
  readonly entryPointLevel: unknown;
}

export type CompleteOnboardingError =
  ApplicationError<"onboarding_invalid_input">;

function isTimezone(value: string): boolean {
  if (value.length === 0 || value.length > 128) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function parseDailyGoalMinutes(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 120
    ? parsed
    : null;
}

function parsePrimaryGoal(value: unknown): PrimaryGoal | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && primaryGoals.includes(value as PrimaryGoal)
    ? (value as PrimaryGoal)
    : undefined;
}

function parseEntryPointLevel(value: unknown): EntryPointLevel | null {
  return value === "A0" || value === "A1" || value === "A2" ? value : null;
}

export function createCompleteOnboarding(
  dependencies: CompleteOnboardingDependencies,
) {
  return async function execute(
    input: CompleteOnboardingInput,
  ): Promise<Result<LearnerJourney, CompleteOnboardingError>> {
    const timezone = typeof input.timezone === "string" ? input.timezone : "";
    const dailyGoalMinutes = parseDailyGoalMinutes(input.dailyGoalMinutes);
    const primaryGoal = parsePrimaryGoal(input.primaryGoal);
    const entryPointLevel = parseEntryPointLevel(input.entryPointLevel);

    if (
      input.interfaceLocale !== "pt-BR" ||
      !isTimezone(timezone) ||
      dailyGoalMinutes === null ||
      primaryGoal === undefined ||
      entryPointLevel === null
    ) {
      return err<CompleteOnboardingError>({ code: "onboarding_invalid_input" });
    }

    const now = dependencies.clock.now();
    const journey = await dependencies.journeys.saveInitial({
      learnerProfile: {
        userId: input.userId,
        interfaceLocale: "pt-BR",
        timezone,
        dailyGoalMinutes,
        primaryGoal,
      },
      languageProfile: {
        id: dependencies.idGenerator.generate(),
        userId: input.userId,
        sourceLanguage: "pt-BR",
        targetLanguage: "en",
        startingLevel: entryPointLevel,
        currentEstimatedLevel: null,
        status: "active",
      },
      enrollment: {
        id: dependencies.idGenerator.generate(),
        courseId: DEFAULT_ENGLISH_COURSE_ID,
        entryPointLevel,
        placementSource: entryPointLevel === "A0" ? "zero" : "manual",
        status: "active",
      },
      now,
    });

    return ok(journey);
  };
}
