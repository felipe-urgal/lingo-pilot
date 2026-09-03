import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PracticeActivity } from "../server/practice/activity-catalog";
import { PracticeActivityForm } from "../app/app/practice-activity-form";

function activity(
  presentation: PracticeActivity["presentation"],
): PracticeActivity {
  return {
    content: {
      kind: "activity",
      id: `activity.test.${presentation.type}`,
      schemaVersion: 1,
      revision: 1,
      status: "published",
      lessonId: "lesson.test.practice",
      type: presentation.type,
      prompt: { "pt-BR": `Prompt ${presentation.type}` },
      evaluation: { type: "deterministic", acceptedAnswers: ["answer"] },
      conceptIds: ["concept.test.practice"],
      objectiveIds: ["objective.test.practice"],
      modality: "reading",
      supportLevel: 0,
      difficulty: 1,
    },
    definition: { type: "single-choice", choiceIds: [], correctChoiceId: "" },
    presentation,
    hints: [],
    maxAttempts: 3,
  } as PracticeActivity;
}

describe("PracticeActivityForm", () => {
  it.each([
    [
      "single-choice",
      activity({
        type: "single-choice",
        choices: [
          { id: "a", label: "Opção A" },
          { id: "b", label: "Opção B" },
        ],
      }),
    ],
    [
      "multiple-choice",
      activity({
        type: "multiple-choice",
        choices: [
          { id: "a", label: "Opção A" },
          { id: "b", label: "Opção B" },
        ],
      }),
    ],
    ["fill-blank", activity({ type: "fill-blank", placeholder: "Complete" })],
    [
      "short-answer",
      activity({ type: "short-answer", placeholder: "Responda" }),
    ],
    ["translation", activity({ type: "translation", placeholder: "Traduza" })],
    [
      "word-order",
      activity({
        type: "word-order",
        tokens: [
          { id: "i", label: "I" },
          { id: "am", label: "am" },
        ],
      }),
    ],
    [
      "matching",
      activity({
        type: "matching",
        pairs: [
          {
            leftId: "hello",
            leftLabel: "hello",
            rightChoices: [{ id: "ola", label: "olá" }],
          },
        ],
      }),
    ],
  ] as const)("renders an accessible %s activity", (_, practice) => {
    render(
      <PracticeActivityForm
        activity={practice}
        action="/test"
        operationKey="operation-test"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: `Prompt ${practice.presentation.type}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Responder" }),
    ).toBeInTheDocument();
  });

  it("keeps word-order and matching usable without drag interactions", () => {
    render(
      <>
        <PracticeActivityForm
          activity={activity({
            type: "word-order",
            tokens: [
              { id: "i", label: "I" },
              { id: "am", label: "am" },
            ],
          })}
          action="/test"
          operationKey="word-order"
        />
        <PracticeActivityForm
          activity={activity({
            type: "matching",
            pairs: [
              {
                leftId: "hello",
                leftLabel: "hello",
                rightChoices: [{ id: "ola", label: "olá" }],
              },
            ],
          })}
          action="/test"
          operationKey="matching"
        />
      </>,
    );

    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/alternativa por teclado/i)).toBeInTheDocument();
  });
});
