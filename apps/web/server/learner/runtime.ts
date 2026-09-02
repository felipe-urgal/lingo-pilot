import { randomUUID } from "node:crypto";
import { PostgresLearnerJourneyRepository } from "../../../../packages/db/src/runtime.ts";
import { createCompleteOnboarding } from "../application/complete-onboarding";
import { getDatabase } from "../database";

export function getLearnerJourneyRepository() {
  return new PostgresLearnerJourneyRepository(getDatabase());
}

export function getCompleteOnboarding() {
  return createCompleteOnboarding({
    clock: { now: () => new Date() },
    idGenerator: { generate: () => randomUUID() },
    journeys: getLearnerJourneyRepository(),
  });
}
