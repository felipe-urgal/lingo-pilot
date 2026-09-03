import { randomUUID } from "node:crypto";
import { PostgresStudyRepository } from "../../../../packages/db/src/runtime.ts";
import { createGetTodayStudy } from "../application/get-today-study";
import { getEnglishCourseCatalog } from "../content/runtime";
import { getDatabase } from "../database";

export function getStudyRepository() {
  return new PostgresStudyRepository(getDatabase());
}

export function getTodayStudy() {
  return createGetTodayStudy({
    clock: { now: () => new Date() },
    idGenerator: { generate: () => randomUUID() },
    catalog: getEnglishCourseCatalog(),
    study: getStudyRepository(),
  });
}
