import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../server/auth/current-user";
import { getLearnerJourneyRepository } from "../../../server/learner/runtime";
import { getDueReviews } from "../../../server/practice/runtime";
import { PracticeActivityForm } from "../practice-activity-form";

type ReviewPageProps = Readonly<{
  searchParams: Promise<{ result?: string | string[] }>;
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function ReviewFeedback({ status }: Readonly<{ status: string }>) {
  if (!status) return null;
  const copy =
    status === "correct"
      ? "Boa recuperação. A próxima revisão foi reagendada com base neste resultado."
      : status === "incorrect"
        ? "Resposta incorreta. A evidência foi preservada e uma nova revisão foi agendada para mais cedo."
        : status === "stale"
          ? "Esta revisão já foi processada em outra tentativa. A fila abaixo está atualizada."
          : "Não foi possível registrar a revisão. Nenhum estado parcial foi aplicado.";
  return (
    <p className="practice-feedback" role="status">
      {copy}
    </p>
  );
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  if (!journey) redirect("/app/onboarding");

  const query = await searchParams;
  const feedback = firstValue(query.result);
  const due = await getDueReviews()(journey, 20);
  const current = due[0];

  if (!current) {
    return (
      <section className="today-card" aria-labelledby="review-title">
        <p className="eyebrow">Revisão</p>
        <h1 id="review-title">Revisões em dia.</h1>
        <ReviewFeedback status={feedback} />
        <p className="description">
          Não há nenhum item vencido agora. Novas revisões aparecerão aqui
          quando o scheduler atingir o próximo vencimento.
        </p>
        <a className="text-link" href="/app/today">
          Voltar para Hoje
        </a>
      </section>
    );
  }

  return (
    <section className="lesson-player" aria-labelledby="review-title">
      <a className="text-link lesson-player__back-link" href="/app/today">
        ← Hoje
      </a>
      <header className="lesson-player__header">
        <p className="eyebrow">
          Revisão · {due.length} pendente{due.length === 1 ? "" : "s"}
        </p>
        <h1 id="review-title">Recupere antes de conferir.</h1>
        <p className="description">
          A fila é ordenada pelo vencimento. O resultado desta tentativa
          atualiza o próximo intervalo e a evidência de domínio.
        </p>
      </header>

      <ReviewFeedback status={feedback} />
      {current.memory.mastery ? (
        <p className="description">
          Domínio estimado: {current.memory.mastery.scorePercent}% · confiança{" "}
          {current.memory.mastery.confidencePercent}%
        </p>
      ) : null}

      <PracticeActivityForm
        action="/api/study/review/submit"
        activity={current.activity}
        operationKey={randomUUID()}
        hiddenFields={[{ name: "memoryItemId", value: current.memory.id }]}
        submitLabel="Responder revisão"
      />
    </section>
  );
}
