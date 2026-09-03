import type { LocalizedText } from "../../../../../../packages/content/src/index.ts";

export interface RenderableLessonBlock {
  readonly id: string;
  readonly type: string;
  readonly text: LocalizedText;
  readonly language?: string;
}

const blockLabels = {
  explanation: "Explicação",
  rule: "Regra",
  example: "Exemplo",
  comparison: "Comparação",
  "common-error": "Erro comum",
  vocabulary: "Vocabulário",
  pronunciation: "Pronúncia",
  media: "Mídia",
  checkpoint: "Checkpoint",
} as const;

function localizedText(text: LocalizedText): string {
  return text["pt-BR"] ?? text.en ?? Object.values(text)[0] ?? "";
}

export function LessonContentBlock({
  block,
}: Readonly<{ block: RenderableLessonBlock }>) {
  const label = blockLabels[block.type as keyof typeof blockLabels];
  if (!label) {
    console.warn("lesson_player.unsupported_block", {
      blockId: block.id,
      blockType: block.type,
    });
    return (
      <section className="lesson-block lesson-block--unsupported" role="alert">
        <p className="lesson-block__label">Conteúdo indisponível</p>
        <p>
          Este passo usa um formato que esta versão do aplicativo não consegue
          exibir com segurança.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`lesson-block lesson-block--${block.type}`}
      aria-labelledby={`${block.id}-label`}
    >
      <p className="lesson-block__label" id={`${block.id}-label`}>
        {label}
      </p>
      <p className="lesson-block__text" lang={block.language}>
        {localizedText(block.text)}
      </p>
    </section>
  );
}
