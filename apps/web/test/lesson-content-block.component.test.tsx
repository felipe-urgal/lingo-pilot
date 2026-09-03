import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonContentBlock } from "../app/app/lesson/[lessonId]/lesson-content-block";

const supportedTypes = [
  ["explanation", "Explicação"],
  ["rule", "Regra"],
  ["example", "Exemplo"],
  ["comparison", "Comparação"],
  ["common-error", "Erro comum"],
  ["vocabulary", "Vocabulário"],
  ["pronunciation", "Pronúncia"],
  ["media", "Mídia"],
  ["checkpoint", "Checkpoint"],
] as const;

describe("LessonContentBlock", () => {
  it.each(supportedTypes)("renders %s blocks with an explicit label", (type, label) => {
    render(
      <LessonContentBlock
        block={{
          id: `block.${type}`,
          type,
          text: { "pt-BR": `Conteúdo ${type}` },
        }}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(`Conteúdo ${type}`)).toBeInTheDocument();
  });

  it("fails safely and records an observable warning for an unknown block", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <LessonContentBlock
        block={{
          id: "block.unknown",
          type: "future-block",
          text: { "pt-BR": "payload não renderizado" },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Conteúdo indisponível");
    expect(screen.queryByText("payload não renderizado")).not.toBeInTheDocument();
    expect(warning).toHaveBeenCalledWith("lesson_player.unsupported_block", {
      blockId: "block.unknown",
      blockType: "future-block",
    });
    warning.mockRestore();
  });
});
