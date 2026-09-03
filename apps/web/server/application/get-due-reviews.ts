import type {
  Clock,
  DueReviewItem,
  LearnerJourney,
  PracticeRepository,
} from "../../../../packages/domain/src/index.ts";
import type { CurriculumCatalog } from "../../../../packages/content/src/index.ts";
import {
  getPracticeActivity,
  type PracticeActivity,
} from "../practice/activity-catalog";

export type DueReview = Readonly<{
  memory: DueReviewItem;
  activity: PracticeActivity;
}>;

export interface GetDueReviewsDependencies {
  readonly clock: Clock;
  readonly catalog: CurriculumCatalog;
  readonly practice: PracticeRepository;
}

export function createGetDueReviews(dependencies: GetDueReviewsDependencies) {
  return async function execute(
    journey: LearnerJourney,
    limit = 20,
  ): Promise<readonly DueReview[]> {
    const due = await dependencies.practice.listDueReviewItems(
      journey.enrollment.id,
      dependencies.clock.now(),
      limit,
    );

    return due.flatMap((memory) => {
      const activity = getPracticeActivity(
        dependencies.catalog,
        memory.sourceActivityId,
      );
      return activity ? [{ memory, activity }] : [];
    });
  };
}
