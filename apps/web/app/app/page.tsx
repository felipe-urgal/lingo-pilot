import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../server/auth/current-user";
import { getLearnerJourneyRepository } from "../../server/learner/runtime";

export default async function ProtectedHomePage() {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  redirect(journey ? "/app/today" : "/app/onboarding");
}
