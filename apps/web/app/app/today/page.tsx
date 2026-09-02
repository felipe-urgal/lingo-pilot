import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../server/auth/current-user";
import { getLearnerJourneyRepository } from "../../../server/learner/runtime";

const goalLabels = {
  conversation: "Conversação",
  travel: "Viagens",
  work: "Trabalho",
  study: "Estudos",
  other: "Outro",
} as const;

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  if (!journey) redirect("/app/onboarding");

  const manualPlacement = journey.enrollment.placementSource === "manual";

  return (
    <section className="today-card" aria-labelledby="today-title">
      <p className="eyebrow">Hoje</p>
      <h1 id="today-title">Sua jornada está pronta.</h1>
      <p className="description">
        A próxima etapa do Study Engine vai transformar esta matrícula em uma sessão diária. Por enquanto, seu ponto de entrada e sua rotina já estão persistidos.
      </p>
      <dl className="journey-summary">
        <div><dt>Jornada</dt><dd>Português (Brasil) → Inglês</dd></div>
        <div><dt>Ponto de entrada</dt><dd>{journey.enrollment.entryPointLevel}{manualPlacement ? " · escolha manual" : " · do zero"}</dd></div>
        <div><dt>Meta diária</dt><dd>{journey.learnerProfile.dailyGoalMinutes} minutos</dd></div>
        <div><dt>Objetivo</dt><dd>{journey.learnerProfile.primaryGoal ? goalLabels[journey.learnerProfile.primaryGoal] : "Não definido"}</dd></div>
      </dl>
      <a className="text-link" href="/app/onboarding?edit=1">Ajustar preferências</a>
    </section>
  );
}
