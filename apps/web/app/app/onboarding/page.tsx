import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../server/auth/current-user";
import { getLearnerJourneyRepository } from "../../../server/learner/runtime";
import { OnboardingForm } from "./onboarding-form";

type OnboardingPageProps = Readonly<{
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
  }>;
}>;

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  const params = await searchParams;
  const isEditing = params.edit === "1";
  if (journey && !isEditing) redirect("/app/today");

  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <p className="eyebrow">
        {isEditing ? "Preferências" : "Primeiros passos"}
      </p>
      <h1 id="onboarding-title">
        {isEditing ? "Ajuste sua rotina." : "Vamos montar sua jornada."}
      </h1>
      <p className="description">
        {isEditing
          ? "Atualize sua meta e objetivo sem perder sua jornada atual."
          : "Português (Brasil) → Inglês, com uma rotina curta e um ponto de entrada que faz sentido para você."}
      </p>
      <OnboardingForm
        error={error}
        initialDailyGoalMinutes={journey?.learnerProfile.dailyGoalMinutes ?? 15}
        initialEntryPointLevel={journey?.enrollment.entryPointLevel ?? "A0"}
        initialPrimaryGoal={journey?.learnerProfile.primaryGoal ?? null}
        initialTimezone={journey?.learnerProfile.timezone ?? ""}
        isEditing={isEditing && journey !== null}
      />
    </section>
  );
}
