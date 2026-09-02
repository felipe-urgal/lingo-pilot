import { and, eq } from "drizzle-orm";
import type {
  Enrollment,
  EntryPointLevel,
  LanguageProfile,
  LearnerJourney,
  LearnerJourneyRepository,
  LearnerProfile,
  PlacementSource,
  PrimaryGoal,
  SaveInitialLearnerJourneyInput,
} from "../../../domain/src/index.ts";
import type { Database } from "../client.ts";
import { enrollments, languageProfiles, learnerProfiles } from "../schema.ts";

const SOURCE_LANGUAGE = "pt-BR";
const TARGET_LANGUAGE = "en";
const COURSE_ID = "course.en.ptbr.v1";

function learnerProfileFromRow(
  row: typeof learnerProfiles.$inferSelect,
): LearnerProfile {
  return {
    ...row,
    interfaceLocale: "pt-BR",
    primaryGoal: row.primaryGoal as PrimaryGoal | null,
  };
}

function languageProfileFromRow(
  row: typeof languageProfiles.$inferSelect,
): LanguageProfile {
  return {
    ...row,
    sourceLanguage: "pt-BR",
    targetLanguage: "en",
    startingLevel: row.startingLevel as EntryPointLevel,
    currentEstimatedLevel: row.currentEstimatedLevel as EntryPointLevel | null,
    status: "active",
  };
}

function enrollmentFromRow(row: typeof enrollments.$inferSelect): Enrollment {
  return {
    ...row,
    entryPointLevel: row.entryPointLevel as EntryPointLevel,
    placementSource: row.placementSource as PlacementSource,
    status: "active",
  };
}

export class PostgresLearnerJourneyRepository implements LearnerJourneyRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async findForUser(userId: string): Promise<LearnerJourney | null> {
    const [learnerProfile] = await this.database
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, userId))
      .limit(1);
    if (!learnerProfile) return null;

    const [languageProfile] = await this.database
      .select()
      .from(languageProfiles)
      .where(
        and(
          eq(languageProfiles.userId, userId),
          eq(languageProfiles.sourceLanguage, SOURCE_LANGUAGE),
          eq(languageProfiles.targetLanguage, TARGET_LANGUAGE),
        ),
      )
      .limit(1);
    if (!languageProfile) return null;

    const [enrollment] = await this.database
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.languageProfileId, languageProfile.id),
          eq(enrollments.courseId, COURSE_ID),
        ),
      )
      .limit(1);
    if (!enrollment) return null;

    return {
      learnerProfile: learnerProfileFromRow(learnerProfile),
      languageProfile: languageProfileFromRow(languageProfile),
      enrollment: enrollmentFromRow(enrollment),
    };
  }

  async saveInitial(
    input: SaveInitialLearnerJourneyInput,
  ): Promise<LearnerJourney> {
    return this.database.transaction(async (transaction) => {
      const [learnerProfile] = await transaction
        .insert(learnerProfiles)
        .values({
          ...input.learnerProfile,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: learnerProfiles.userId,
          set: {
            interfaceLocale: input.learnerProfile.interfaceLocale,
            timezone: input.learnerProfile.timezone,
            dailyGoalMinutes: input.learnerProfile.dailyGoalMinutes,
            primaryGoal: input.learnerProfile.primaryGoal,
            updatedAt: input.now,
          },
        })
        .returning();
      if (!learnerProfile) throw new Error("Failed to persist learner profile");

      const [languageProfile] = await transaction
        .insert(languageProfiles)
        .values({
          ...input.languageProfile,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [
            languageProfiles.userId,
            languageProfiles.sourceLanguage,
            languageProfiles.targetLanguage,
          ],
          set: {
            status: input.languageProfile.status,
            updatedAt: input.now,
          },
        })
        .returning();
      if (!languageProfile)
        throw new Error("Failed to persist language profile");

      const [enrollment] = await transaction
        .insert(enrollments)
        .values({
          ...input.enrollment,
          languageProfileId: languageProfile.id,
          enrolledAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [enrollments.languageProfileId, enrollments.courseId],
          set: {
            status: input.enrollment.status,
            updatedAt: input.now,
          },
        })
        .returning();
      if (!enrollment) throw new Error("Failed to persist enrollment");

      return {
        learnerProfile: learnerProfileFromRow(learnerProfile),
        languageProfile: languageProfileFromRow(languageProfile),
        enrollment: enrollmentFromRow(enrollment),
      };
    });
  }
}
