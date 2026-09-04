import { randomUUID } from "node:crypto";
import {
  PostgresPracticeRepository,
  PostgresSessionExecutionRepository,
  PostgresStudyRepository,
} from "../../../../packages/db/src/runtime.ts";
import { createGetDueReviews } from "../application/get-due-reviews";
import { createSubmitActivityAttempt } from "../application/submit-activity-attempt";
import { createSubmitReview } from "../application/submit-review";
import { getEnglishCourseCatalog } from "../content/runtime";
import { getDatabase } from "../database";

function dependencies() {
  const database = getDatabase();
  return {
    clock: { now: () => new Date() },
    idGenerator: { generate: () => randomUUID() },
    catalog: getEnglishCourseCatalog(),
    practice: new PostgresPracticeRepository(database),
    study: new PostgresStudyRepository(database),
    execution: new PostgresSessionExecutionRepository(database),
  };
}

export function getPracticeRepository() {
  return new PostgresPracticeRepository(getDatabase());
}

export function getSubmitActivityAttempt() {
  return createSubmitActivityAttempt(dependencies());
}

export function getDueReviews() {
  const { clock, catalog, practice } = dependencies();
  return createGetDueReviews({ clock, catalog, practice });
}

export function getSubmitReview() {
  const { clock, idGenerator, catalog, practice, execution } = dependencies();
  return createSubmitReview({ clock, idGenerator, catalog, practice, execution });
}
