export const entryPointLevels = ["A0", "A1", "A2"] as const;
export type EntryPointLevel = (typeof entryPointLevels)[number];

export const placementSources = ["zero", "manual"] as const;
export type PlacementSource = (typeof placementSources)[number];

export const primaryGoals = [
  "conversation",
  "travel",
  "work",
  "study",
  "other",
] as const;
export type PrimaryGoal = (typeof primaryGoals)[number];

export type LearnerStatus = "active";
export type EnrollmentStatus = "active";

export interface LearnerProfile {
  readonly userId: string;
  readonly interfaceLocale: "pt-BR";
  readonly timezone: string;
  readonly dailyGoalMinutes: number;
  readonly primaryGoal: PrimaryGoal | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LanguageProfile {
  readonly id: string;
  readonly userId: string;
  readonly sourceLanguage: "pt-BR";
  readonly targetLanguage: "en";
  readonly startingLevel: EntryPointLevel;
  readonly currentEstimatedLevel: EntryPointLevel | null;
  readonly status: LearnerStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Enrollment {
  readonly id: string;
  readonly languageProfileId: string;
  readonly courseId: string;
  readonly entryPointLevel: EntryPointLevel;
  readonly placementSource: PlacementSource;
  readonly status: EnrollmentStatus;
  readonly enrolledAt: Date;
  readonly updatedAt: Date;
}

export interface LearnerJourney {
  readonly learnerProfile: LearnerProfile;
  readonly languageProfile: LanguageProfile;
  readonly enrollment: Enrollment;
}
