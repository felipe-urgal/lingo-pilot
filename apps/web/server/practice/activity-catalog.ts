import type {
  Activity,
  CurriculumCatalog,
} from "../../../../packages/content/src/index.ts";
import type {
  DeterministicActivityDefinition,
  DeterministicActivityType,
} from "../../../../packages/learning/src/index.ts";

export type PracticeChoice = Readonly<{
  id: string;
  label: string;
}>;

export type PracticePair = Readonly<{
  leftId: string;
  leftLabel: string;
  rightChoices: readonly PracticeChoice[];
}>;

export type PracticePresentation =
  | Readonly<{
      type: "single-choice" | "multiple-choice";
      choices: readonly PracticeChoice[];
    }>
  | Readonly<{
      type: "fill-blank" | "short-answer" | "translation";
      placeholder?: string;
    }>
  | Readonly<{
      type: "word-order";
      tokens: readonly PracticeChoice[];
    }>
  | Readonly<{
      type: "matching";
      pairs: readonly PracticePair[];
    }>;

export type PracticeActivity = Readonly<{
  content: Activity;
  definition: DeterministicActivityDefinition;
  presentation: PracticePresentation;
  hints: readonly string[];
  maxAttempts: number;
}>;

const presentations = new Map<string, PracticePresentation>([
  [
    "activity.a0.bootstrap.lesson-flow-check",
    {
      type: "single-choice",
      choices: [
        { id: "complete-lesson", label: "Usar “Concluir aula” no último passo" },
        { id: "open-last-step", label: "Apenas abrir o último passo" },
        { id: "return-today", label: "Voltar para a tela Hoje" },
      ],
    },
  ],
]);

const hints = new Map<string, readonly string[]>([
  [
    "activity.a0.bootstrap.lesson-flow-check",
    ["A conclusão precisa ser uma ação explícita, não apenas a visualização do último passo."],
  ],
]);

function acceptedAnswers(activity: Activity): readonly string[] | null {
  if (activity.evaluation.type !== "deterministic") return null;
  const answers = activity.evaluation.acceptedAnswers ?? [];
  return answers.length > 0 ? answers : null;
}

function matchesPresentationType(
  activityType: DeterministicActivityType,
  presentation: PracticePresentation,
): boolean {
  return presentation.type === activityType;
}

function buildDefinition(
  activity: Activity,
  presentation: PracticePresentation,
): DeterministicActivityDefinition | null {
  const answers = acceptedAnswers(activity);
  if (!answers) return null;

  switch (activity.type) {
    case "single-choice":
      if (presentation.type !== "single-choice") return null;
      return {
        type: "single-choice",
        choiceIds: presentation.choices.map((choice) => choice.id),
        correctChoiceId: answers[0] ?? "",
      };
    case "multiple-choice":
      if (presentation.type !== "multiple-choice") return null;
      return {
        type: "multiple-choice",
        choiceIds: presentation.choices.map((choice) => choice.id),
        correctChoiceIds: answers,
      };
    case "fill-blank":
    case "short-answer":
    case "translation":
      if (presentation.type !== activity.type) return null;
      return {
        type: activity.type,
        acceptedAnswers: answers,
        normalization: { locale: "pt-BR" },
      };
    case "word-order": {
      if (presentation.type !== "word-order") return null;
      const correctOrder = (answers[0] ?? "")
        .split(" ")
        .map((token) => token.trim())
        .filter(Boolean);
      if (correctOrder.length === 0) return null;
      return {
        type: "word-order",
        tokenIds: presentation.tokens.map((token) => token.id),
        correctOrder,
      };
    }
    case "matching": {
      if (presentation.type !== "matching") return null;
      const pairs = Object.fromEntries(
        answers.flatMap((answer) => {
          const separator = answer.indexOf("=");
          if (separator <= 0 || separator === answer.length - 1) return [];
          return [[answer.slice(0, separator), answer.slice(separator + 1)]];
        }),
      );
      return Object.keys(pairs).length === answers.length
        ? { type: "matching", pairs }
        : null;
    }
    default:
      return null;
  }
}

export function getPracticeActivity(
  catalog: CurriculumCatalog,
  activityId: string,
): PracticeActivity | null {
  const content = catalog.activityById.get(activityId);
  const presentation = presentations.get(activityId);
  if (!content || content.status !== "published" || !presentation) return null;
  if (
    !matchesPresentationType(
      content.type as DeterministicActivityType,
      presentation,
    )
  ) {
    return null;
  }
  const definition = buildDefinition(content, presentation);
  if (!definition) return null;

  return {
    content,
    definition,
    presentation,
    hints: hints.get(activityId) ?? [],
    maxAttempts: 3,
  };
}

export function listPracticeActivitiesForLesson(
  catalog: CurriculumCatalog,
  lessonId: string,
): readonly PracticeActivity[] {
  return catalog.activities
    .filter((activity) => activity.lessonId === lessonId)
    .map((activity) => getPracticeActivity(catalog, activity.id))
    .filter((activity): activity is PracticeActivity => activity !== null);
}
