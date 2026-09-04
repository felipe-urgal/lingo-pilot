import { Button } from "@lingo-pilot/ui";
import type { StudySession } from "../../../../../packages/domain/src/index.ts";
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

function CompletedToday({
  session,
  currentLocalStudyDate,
}: Readonly<{
  session: StudySession;
  currentLocalStudyDate: string;
}>) {
  const completed = session.items.filter((item) => item.status === "completed");
  const skipped = session.items.filter((item) => item.status === "skipped");
  const lessons = completed.filter((item) => item.kind === "lesson").length;
  const reviews = completed.filter((item) => item.kind === "review").length;
  const crossedDay = session.localStudyDate !== currentLocalStudyDate;

  return (
    <>
      <p className="eyebrow">{crossedDay ? "Sessão retomada" : "Hoje"}</p>
      <h1 id="today-title">Estudo concluído.</h1>
      <p className="description">
        {lessons} aula{lessons === 1 ? "" : "s"} e {reviews} revisão
        {reviews === 1 ? "" : "ões"} concluída{reviews === 1 ? "" : "s"} a
        partir dos itens persistidos.
      </p>
      {skipped.length > 0 ? (
        <p className="description">
          {skipped.length} item{skipped.length === 1 ? "" : "s"} indisponível
          {skipped.length === 1 ? " foi ignorado" : " foram ignorados"} com
          recuperação explícita; nenhum deles contou como aprendizagem
          concluída.
        </p>
      ) : null}
      {crossedDay ? (
        <p className="description">
          Esta sessão manteve a data original {session.localStudyDate} mesmo
          após a mudança para {currentLocalStudyDate}.
        </p>
      ) : null}
    </>
  );
}

function isPending(status: string): boolean {
  return status === "planned" || status === "in_progress";
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
        <CompletedToday
          session={today.session}
          currentLocalStudyDate={today.localStudyDate}
        />
        <ReviewLink count={dueReviews.length} />
      </section>
    );
  }

  const item = today.session.items.find((candidate) =>
    isPending(candidate.status),
  );
  if (!item) {
    return (
      <section className="today-card" aria-labelledby="today-title">
        <p className="eyebrow">Hoje</p>
        <h1 id="today-title">Não foi possível finalizar sua sessão.</h1>
        <p className="description">
          Os itens estão preservados. Recarregue a página; nenhuma atividade
          será criada ou concluída automaticamente.
        </p>
        <ReviewLink count={dueReviews.length} />
      </section>
    );
  }

  const crossedDay = today.session.localStudyDate !== today.localStudyDate;

  if (item.kind === "review") {
    const plannedReviews = today.session.items.filter(
      (candidate) => candidate.kind === "review" && isPending(candidate.status),
    );
    return (
      <section className="today-card" aria-labelledby="today-title">
        <p className="eyebrow">
          {crossedDay ? `Retomada · ${today.session.localStudyDate}` : "Hoje"} ·{" "}
          {item.estimatedMinutes} min
        </p>
        <h1 id="today-title">Comece pelas revisões prioritárias.</h1>
        <div className="today-plan" aria-label="Plano de estudo atual">
          <p className="today-plan__label">Revisar</p>
          <h2>
            {plannedReviews.length} revisão
            {plannedReviews.length === 1 ? "" : "ões"} no plano
          </h2>
          <p>O snapshot persistido continua sendo a fonte de verdade.</p>
        </div>
        <form action="/app/review" method="get">
          <input type="hidden" name="source" value="today" />
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
        <p className="eyebrow">Recuperação da sessão</p>
        <h1 id="today-title">Este conteúdo não pode mais ser executado.</h1>
        <p className="description">
          O item continua preservado no snapshot. Você pode marcá-lo como
          indisponível e seguir para o próximo item sem registrar conclusão de
          aprendizagem.
        </p>
        <form action="/api/study/session/recover" method="post">
          <input type="hidden" name="sessionId" value={today.session.id} />
          <input type="hidden" name="itemId" value={item.id} />
          <Button type="submit">Ignorar item indisponível e continuar</Button>
        </form>
        <ReviewLink count={dueReviews.length} />
      </section>
    );
  }

  const isContinuing = item.status === "in_progress";

  return (
    <section className="today-card" aria-labelledby="today-title">
      <p className="eyebrow">
        {crossedDay ? `Retomada · ${today.session.localStudyDate}` : "Hoje"} ·{" "}
        {item.estimatedMinutes} min
      </p>
      <h1 id="today-title">
        {isContinuing
          ? "Continue de onde parou."
          : "Sua próxima ação está pronta."}
      </h1>
      <div className="today-plan" aria-label="Plano de estudo atual">
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
