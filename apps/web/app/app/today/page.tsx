import { Button } from "@lingo-pilot/ui";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../server/auth/current-user";
import { getLearnerJourneyRepository } from "../../../server/learner/runtime";
import { getDueReviews } from "../../../server/practice/runtime";
import { getTodayStudy } from "../../../server/study/runtime";

function ReviewLink({ count }: Readonly<{ count: number }>) {
  return (
    <a className="text-link" href="/app/review">
      {count > 0
        ? `Revisar agora · ${count} pendente${count === 1 ? "" : "s"}`
        : "Ver revisões"}
    </a>
  );
}

function EmptyToday() {
  return (
    <>
      <p className="eyebrow">Hoje</p>
      <h1 id="today-title">Sua próxima aula ainda não está disponível.</h1>
      <p className="description">
        Sua matrícula e seu ponto de entrada estão preservados. Assim que houver
        conteúdo publicado e elegível para este nível, ele aparecerá aqui sem
        precisar refazer o onboarding.
      </p>
    </>
  );
}

function CompletedToday() {
  return (
    <>
      <p className="eyebrow">Hoje</p>
      <h1 id="today-title">Estudo de hoje concluído.</h1>
      <p className="description">
        Sua sessão ficou registrada. A próxima sessão será planejada na sua
        próxima data local de estudo.
      </p>
    </>
  );
}

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  if (!journey) redirect("/app/onboarding");

  const dueReviews = await getDueReviews()(journey, 20);
  const today = await getTodayStudy()(journey);
  if (!today.session) {
    return (
      <section className="today-card" aria-labelledby="today-title">
        <EmptyToday />
        <ReviewLink count={dueReviews.length} />
        <a className="text-link" href="/app/onboarding?edit=1">
          Ajustar preferências
        </a>
      </section>
    );
  }
  if (today.session.status === "completed") {
    return (
      <section className="today-card" aria-labelledby="today-title">
        <CompletedToday />
        <ReviewLink count={dueReviews.length} />
      </section>
    );
  }

  const item = today.session.items.find(
    (candidate) => candidate.status !== "completed",
  );
  if (!item) {
    return (
      <section className="today-card" aria-labelledby="today-title">
        <p className="eyebrow">Hoje</p>
        <h1 id="today-title">Não foi possível carregar sua sessão.</h1>
        <p className="description">
          O plano está preservado, mas nenhum item pendente foi encontrado.
        </p>
        <ReviewLink count={dueReviews.length} />
      </section>
    );
  }

  if (item.kind === "review") {
    const plannedReviews = today.session.items.filter(
      (candidate) =>
        candidate.kind === "review" && candidate.status !== "completed",
    );
    return (
      <section className="today-card" aria-labelledby="today-title">
        <p className="eyebrow">Hoje · {item.estimatedMinutes} min</p>
        <h1 id="today-title">Comece pelas revisões prioritárias.</h1>
        <div className="today-plan" aria-label="Plano de estudo de hoje">
          <p className="today-plan__label">Revisar</p>
          <h2>
            {plannedReviews.length} revisão{plannedReviews.length === 1 ? "" : "ões"}{" "}
            no plano de hoje
          </h2>
          <p>O planner priorizou o que precisa ser recuperado agora.</p>
        </div>
        <form action="/app/review" method="get">
          <Button type="submit">Começar revisões</Button>
        </form>
        <a className="text-link" href="/app/onboarding?edit=1">
          Ajustar preferências
        </a>
      </section>
    );
  }

  if (!today.lesson || today.lesson.id !== item.resourceId) {
    return (
      <section className="today-card" aria-labelledby="today-title">
        <p className="eyebrow">Hoje</p>
        <h1 id="today-title">Não foi possível carregar sua sessão.</h1>
        <p className="description">
          O plano está preservado, mas o conteúdo associado não está disponível
          nesta revisão. Tente novamente depois de uma atualização do conteúdo.
        </p>
        <ReviewLink count={dueReviews.length} />
      </section>
    );
  }

  const isContinuing = item.status === "in_progress";

  return (
    <section className="today-card" aria-labelledby="today-title">
      <p className="eyebrow">Hoje · {item.estimatedMinutes} min</p>
      <h1 id="today-title">
        {isContinuing
          ? "Continue de onde parou."
          : "Sua próxima ação está pronta."}
      </h1>
      <div className="today-plan" aria-label="Plano de estudo de hoje">
        <p className="today-plan__label">Aprender</p>
        <h2>{today.lesson.title["pt-BR"]}</h2>
        <p>
          {journey.enrollment.entryPointLevel} · ~{item.estimatedMinutes}{" "}
          minutos
        </p>
      </div>
      <form action="/api/study/session/start" method="post">
        <input type="hidden" name="sessionId" value={today.session.id} />
        <input type="hidden" name="itemId" value={item.id} />
        <Button type="submit">
          {isContinuing ? "Continuar estudo" : "Começar estudo"}
        </Button>
      </form>
      <ReviewLink count={dueReviews.length} />
      <a className="text-link" href="/app/onboarding?edit=1">
        Ajustar preferências
      </a>
    </section>
  );
}
