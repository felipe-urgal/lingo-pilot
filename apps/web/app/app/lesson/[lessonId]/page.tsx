import { randomUUID } from "node:crypto";
import { Button } from "@lingo-pilot/ui";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../../server/auth/current-user";
import { getEnglishCourseCatalog } from "../../../../server/content/runtime";
import { getLearnerJourneyRepository } from "../../../../server/learner/runtime";
import { listPracticeActivitiesForLesson } from "../../../../server/practice/activity-catalog";
import { getLessonPlayer } from "../../../../server/study/runtime";
import { PracticeActivityForm } from "../../practice-activity-form";
import { LessonContentBlock } from "./lesson-content-block";

type LessonPageProps = Readonly<{
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{
    session?: string | string[];
    item?: string | string[];
    practice?: string | string[];
  }>;
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function localizedText(text: Readonly<Record<string, string>>): string {
  return text["pt-BR"] ?? text.en ?? Object.values(text)[0] ?? "";
}

function PracticeFeedback({ status }: Readonly<{ status: string }>) {
  if (!status) return null;
  const copy =
    status === "correct"
      ? "Resposta correta. A tentativa foi registrada e este conteúdo entrou na sua agenda de revisão."
      : status === "incorrect"
        ? "Ainda não. A tentativa foi preservada; revise a explicação ou use a dica e tente novamente."
        : "Não foi possível registrar esta tentativa. Nenhum progresso parcial foi aplicado.";
  return (
    <p className="practice-feedback" role="status">
      {copy}
    </p>
  );
}

function LessonUnavailable({
  reason,
}: Readonly<{
  reason:
    | "content-unavailable"
    | "revision-conflict"
    | "invalid-position"
    | "invalid-reference";
}>) {
  const copy =
    reason === "revision-conflict"
      ? "O conteúdo desta aula foi atualizado depois que sua sessão foi criada. Seu progresso foi preservado e a sessão não será concluída automaticamente."
      : reason === "content-unavailable"
        ? "Esta aula não está disponível nesta revisão do currículo. Seu progresso foi preservado."
        : reason === "invalid-position"
          ? "A posição salva desta aula não é compatível com o conteúdo atual. Seu progresso foi preservado para uma correção segura."
          : "Não foi possível abrir esta aula a partir da sessão informada.";

  return (
    <section
      className="lesson-player lesson-player--unavailable"
      aria-labelledby="lesson-title"
    >
      <p className="eyebrow">Aula indisponível</p>
      <h1 id="lesson-title">Não foi possível continuar agora.</h1>
      <p className="description">{copy}</p>
      <a className="text-link" href="/app/today">
        Voltar para Hoje
      </a>
    </section>
  );
}

export default async function LessonPage({
  params,
  searchParams,
}: LessonPageProps) {
  const user = await requireCurrentUser();
  const journey = await getLearnerJourneyRepository().findForUser(user.id);
  if (!journey) redirect("/app/onboarding");

  const { lessonId } = await params;
  const query = await searchParams;
  const sessionId = firstValue(query.session);
  const itemId = firstValue(query.item);
  const practiceStatus = firstValue(query.practice);
  if (!sessionId || !itemId) redirect("/app/today");

  const player = await getLessonPlayer()({
    journey,
    sessionId,
    itemId,
    lessonId,
  });
  if (!player.ok) {
    if (player.reason === "completed" || player.reason === "not-started") {
      redirect("/app/today");
    }
    return <LessonUnavailable reason={player.reason} />;
  }

  const currentIndex = player.progress.currentBlockIndex;
  const currentBlock = player.lesson.blocks[currentIndex];
  if (!currentBlock) {
    return <LessonUnavailable reason="invalid-position" />;
  }
  const isLastBlock = currentIndex === player.totalBlocks - 1;
  const practiceActivities = isLastBlock
    ? listPracticeActivitiesForLesson(
        getEnglishCourseCatalog(),
        player.lesson.id,
      )
    : [];

  return (
    <article className="lesson-player" aria-labelledby="lesson-title">
      <a className="text-link lesson-player__back-link" href="/app/today">
        ← Hoje
      </a>
      <header className="lesson-player__header">
        <p className="eyebrow">Aula · revisão {player.lesson.revision}</p>
        <h1 id="lesson-title">{localizedText(player.lesson.title)}</h1>
        <p className="description">
          {player.lesson.estimatedMinutes} min estimados · conteúdo versionado
        </p>
      </header>

      <section
        className="lesson-objectives"
        aria-labelledby="lesson-objective-title"
      >
        <h2 id="lesson-objective-title">Objetivo</h2>
        <ul>
          {player.lesson.objectives.map((objective) => (
            <li key={objective.id}>{localizedText(objective.description)}</li>
          ))}
        </ul>
      </section>

      <div className="lesson-progress" aria-live="polite">
        <label htmlFor="lesson-progress-bar">
          Passo {currentIndex + 1} de {player.totalBlocks}
        </label>
        <progress
          id="lesson-progress-bar"
          max={player.totalBlocks}
          value={currentIndex + 1}
        />
      </div>

      <LessonContentBlock block={currentBlock} />

      {isLastBlock ? <PracticeFeedback status={practiceStatus} /> : null}
      {practiceActivities.map((activity) => (
        <PracticeActivityForm
          key={activity.content.id}
          action="/api/study/activity/submit"
          activity={activity}
          operationKey={randomUUID()}
          hiddenFields={[
            { name: "sessionId", value: sessionId },
            { name: "itemId", value: itemId },
            { name: "lessonId", value: player.lesson.id },
          ]}
          submitLabel="Verificar resposta"
        />
      ))}

      <form
        className="lesson-navigation"
        action="/api/study/lesson/navigate"
        method="post"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="lessonId" value={player.lesson.id} />
        <input type="hidden" name="expectedBlockIndex" value={currentIndex} />
        <Button
          disabled={currentIndex === 0}
          name="action"
          type="submit"
          value="back"
          variant="secondary"
        >
          Voltar
        </Button>
        <Button
          name="action"
          type="submit"
          value={isLastBlock ? "complete" : "next"}
        >
          {isLastBlock ? "Concluir aula" : "Continuar"}
        </Button>
      </form>
    </article>
  );
}
