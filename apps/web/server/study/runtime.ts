import { randomUUID } from "node:crypto";
import {
  PostgresPracticeRepository,
  PostgresSessionExecutionRepository,
  PostgresStudyRepository,
} from "../../../../packages/db/src/runtime.ts";
import { createGetLessonPlayer } from "../application/get-lesson-player";
import { createGetTodayStudy } from "../application/get-today-study";
import { createNavigateLessonPlayer } from "../application/navigate-lesson-player";
import { createRecoverSessionItem } from "../application/recover-session-item";
import { createStartLessonPlayer } from "../application/start-lesson-player";
import { getEnglishCourseCatalog } from "../content/runtime";
import { getDatabase } from "../database";
import { noopTelemetryHooks } from "../observability/contracts";

const availableStudyModalities = ["reading", "writing", "mixed"] as const;

function dependencies() {
  const database = getDatabase();
  return {
    clock: { now: () => new Date() },
    idGenerator: { generate: () => randomUUID() },
    catalog: getEnglishCourseCatalog(),
    study: new PostgresStudyRepository(database),
    practice: new PostgresPracticeRepository(database),
    execution: new PostgresSessionExecutionRepository(database),
    availableModalities: availableStudyModalities,
    telemetry: noopTelemetryHooks,
  };
}

export function getStudyRepository() {
  return new PostgresStudyRepository(getDatabase());
}

export function getTodayStudy() {
  return createGetTodayStudy(dependencies());
}

export function getStartLessonPlayer() {
  const { clock, catalog, study } = dependencies();
  return createStartLessonPlayer({ clock, catalog, study });
}

export function getLessonPlayer() {
  const { catalog, study } = dependencies();
  return createGetLessonPlayer({ catalog, study });
}

export function getNavigateLessonPlayer() {
  const { clock, catalog, study, execution } = dependencies();
  return createNavigateLessonPlayer({ clock, catalog, study, execution });
}

export function getRecoverSessionItem() {
  const { clock, catalog, study, execution, telemetry } = dependencies();
  return createRecoverSessionItem({
    clock,
    catalog,
    study,
    execution,
    telemetry,
  });
}
