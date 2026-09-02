import type {
  EnrollmentStatus,
  EntryPointLevel,
  LearnerJourney,
  LearnerStatus,
  PlacementSource,
  PrimaryGoal,
} from "./learner-journey.ts";

export interface SaveInitialLearnerJourneyInput {
  readonly learnerProfile: {
    readonly userId: string;
    readonly interfaceLocale: "pt-BR";
    readonly timezone: string;
    readonly dailyGoalMinutes: number;
    readonly primaryGoal: PrimaryGoal | null;
  };
  readonly languageProfile: {
    readonly id: string;
    readonly userId: string;
    readonly sourceLanguage: "pt-BR";
    readonly targetLanguage: "en";
    readonly startingLevel: EntryPointLevel;
    readonly currentEstimatedLevel: EntryPointLevel | null;
    readonly status: LearnerStatus;
  };
  readonly enrollment: {
    readonly id: string;
    readonly courseId: string;
    readonly entryPointLevel: EntryPointLevel;
    readonly placementSource: PlacementSource;
    readonly status: EnrollmentStatus;
  };
  readonly now: Date;
}

export interface LearnerJourneyRepository {
  findForUser(userId: string): Promise<LearnerJourney | null>;
  saveInitial(input: SaveInitialLearnerJourneyInput): Promise<LearnerJourney>;
}
