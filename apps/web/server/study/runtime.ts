import { randomUUID } from "node:crypto";
import { PostgresStudyRepository } from "../../../../packages/db/src/runtime.ts";
import { createGetLessonPlayer } from "../application/get-lesson-player";
import { createGetTodayStudy } from "../application/get-today-study";
import { createNavigateLessonPlayer } from "../application/navigate-lesson-player";
import { createStartLessonPlayer } from "../application/start-lesson-player";
import { getEnglishCourseCatalog } from "../content/runtime";
import { getDatabase } from "../database";

export function getStudyRepository() {
  return new PostgresStudyRepository(getDatabase());
}

function lessonPlayerDependencies() {
  return {
    clock: { now: () => new Date() },
    catalog: getEnglishCourseCatalog(),
    study: getStudyRepository(),
  };
}

export function getTodayStudy() {
  return createGetTodayStudy({
    clock: { now: () => new Date() },
    idGenerator: { generate: () => randomUUID() },
    catalog: getEnglishCourseCatalog(),
    study: getStudyRepository(),
  });
}

export function getLessonPlayer() {
  return createGetLessonPlayer(lessonPlayerDependencies());
}

export function getStartLessonPlayer() {
  return createStartLessonPlayer(lessonPlayerDependencies());
}

export function getNavigateLessonPlayer() {
  return createNavigateLessonPlayer(lessonPlayerDependencies());
}
