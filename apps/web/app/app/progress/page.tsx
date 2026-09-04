import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../server/auth/current-user";
import { getLearnerJourneyRepository } from "../../../server/learner/runtime";
import { getProgressOverview } from "../../../server/progress/runtime";
import styles from "./progress.module.css";

type ProgressPageProps = Readonly<{
  searchParams: Promise<{ page?: string | string[] }>;
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positivePage(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatStudyDate(localStudyDate: string, locale: string): string {
  const [year, month, day] = localStudyDate.split("-").map(Number);
  if (!year || !month || !day) return localStudyDate;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function sessionStatus(status: string): string {
  if (status === "completed") return "Concluída";
  if (status === "in_progress") return "Em andamento";
  if (status === "abandoned") return "Encerrada";
  return "Planejada";
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  if (!journey) redirect("/app/onboarding");

  const query = await searchParams;
  const page = positivePage(firstValue(query.page));
  const overview = await getProgressOverview()(journey, { historyPage: page });
  const locale = journey.learnerProfile.interfaceLocale;

  return (
    <section className={styles.page} aria-labelledby="progress-title">
      <header className={styles.header}>
        <p className="eyebrow">Progresso</p>
        <h1 id="progress-title">Sua jornada, sem pontos artificiais.</h1>
        <p className="description">
          Aulas concluídas mostram avanço na trilha. Domínio vem de evidência de
          prática e revisão — são sinais diferentes e aparecem separados.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="progress-location">
        <p className="eyebrow">Onde você está</p>
        <h2 id="progress-location">
          {overview.location.level
            ? `${overview.location.level.cefr} · ${overview.location.level.title}`
            : `Entrada ${overview.location.entryPointLevel}`}
        </h2>
        {overview.location.unit ? <p>{overview.location.unit.title}</p> : null}
        {overview.location.lesson ? (
          <p className={styles.muted}>
            {overview.location.lesson.status === "in_progress"
              ? "Em andamento"
              : "Próxima aula"}
            : {overview.location.lesson.title}
          </p>
        ) : (
          <p className={styles.muted}>
            Nenhuma próxima aula publicada está disponível para este ponto da
            trilha.
          </p>
        )}
        <a className="text-link" href="/app/today">
          Ir para Hoje
        </a>
      </section>

      <section className={styles.section} aria-labelledby="progress-learning">
        <p className="eyebrow">Aprendizado</p>
        <h2 id="progress-learning">Avanço e domínio são medidas distintas.</h2>
        <div className={styles.grid}>
          <article className={styles.stat}>
            <p className={styles.statLabel}>Trilha concluída</p>
            <strong>{overview.learning.completedLessons} aulas</strong>
            <p>
              {overview.learning.startedLessons > 0
                ? `${overview.learning.startedLessons} aula em andamento.`
                : "Nenhuma aula em andamento agora."}
            </p>
          </article>
          <article className={styles.stat}>
            <p className={styles.statLabel}>Domínio estimado</p>
            {overview.learning.masteryConceptCount > 0 &&
            overview.learning.averageMasteryPercent !== null ? (
              <>
                <strong>{overview.learning.averageMasteryPercent}%</strong>
                <p>
                  {overview.learning.masteryConceptCount} conceito
                  {overview.learning.masteryConceptCount === 1 ? "" : "s"} com
                  evidência
                  {overview.learning.averageConfidencePercent !== null
                    ? ` · confiança ${overview.learning.averageConfidencePercent}%`
                    : ""}
                  .
                </p>
              </>
            ) : (
              <p>
                Ainda não há evidência suficiente para estimar domínio. Concluir
                uma aula, sozinho, não cria mastery.
              </p>
            )}
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="progress-reinforce">
        <p className="eyebrow">Reforçar</p>
        <h2 id="progress-reinforce">
          {overview.dueReviewCount > 0
            ? `${overview.dueReviewCount} revisão${overview.dueReviewCount === 1 ? "" : "ões"} pendente${overview.dueReviewCount === 1 ? "" : "s"}`
            : "Revisões em dia"}
        </h2>
        {overview.weakConcepts.length > 0 ? (
          <ul className={styles.list}>
            {overview.weakConcepts.map((concept) => (
              <li key={concept.id}>
                <strong>{concept.title}</strong>
                <span>
                  domínio {concept.scorePercent}% · confiança{" "}
                  {concept.confidencePercent}%
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>
            Nenhum conceito frágil possui evidência suficiente neste momento.
          </p>
        )}
        <a className="text-link" href="/app/review">
          Abrir revisões
        </a>
      </section>

      <section className={styles.section} aria-labelledby="progress-history">
        <p className="eyebrow">Histórico recente</p>
        <h2 id="progress-history">Sessões persistidas</h2>
        <p className={styles.muted}>
          As datas seguem o fuso de estudo configurado na sua jornada.
        </p>
        {overview.history.items.length > 0 ? (
          <ol className={styles.history}>
            {overview.history.items.map((session) => (
              <li key={session.id}>
                <div>
                  <time dateTime={session.localStudyDate}>
                    {formatStudyDate(session.localStudyDate, locale)}
                  </time>
                  <strong>{sessionStatus(session.status)}</strong>
                </div>
                <p>
                  {session.completedLessons} aula
                  {session.completedLessons === 1 ? "" : "s"} ·{" "}
                  {session.completedReviews} revisão
                  {session.completedReviews === 1 ? "" : "ões"}
                  {session.skippedItems > 0
                    ? ` · ${session.skippedItems} item${session.skippedItems === 1 ? "" : "s"} ignorado${session.skippedItems === 1 ? "" : "s"}`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>
            Nenhuma sessão foi registrada ainda. Sua primeira sessão aparecerá
            aqui depois que a jornada começar.
          </p>
        )}
        {(overview.history.hasPrevious || overview.history.hasMore) && (
          <nav className={styles.pagination} aria-label="Páginas do histórico">
            {overview.history.hasPrevious ? (
              <a className="text-link" href={`/app/progress?page=${page - 1}`}>
                ← Mais recentes
              </a>
            ) : (
              <span />
            )}
            {overview.history.hasMore ? (
              <a className="text-link" href={`/app/progress?page=${page + 1}`}>
                Mais antigas →
              </a>
            ) : null}
          </nav>
        )}
      </section>
    </section>
  );
}
