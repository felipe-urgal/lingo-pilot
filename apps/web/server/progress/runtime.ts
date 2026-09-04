import { PostgresProgressRepository } from "../../../../packages/db/src/runtime.ts";
import { createGetProgressOverview } from "../application/get-progress-overview";
import { getEnglishCourseCatalog } from "../content/runtime";
import { getDatabase } from "../database";

export function getProgressOverview() {
  return createGetProgressOverview({
    clock: { now: () => new Date() },
    catalog: getEnglishCourseCatalog(),
    progress: new PostgresProgressRepository(getDatabase()),
  });
}
