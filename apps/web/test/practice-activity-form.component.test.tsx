import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("blocks concurrent submits while the same operation is in flight", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PracticeActivityForm
        activity={activity({ type: "fill-blank", placeholder: "Complete" })}
        action="/api/test"
        operationKey="operation-concurrent"
      />,
    );

    const form = screen.getByRole("button", { name: "Responder" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    resolveRequest?.(new Response(null, { status: 500 }));
  });

  it("preserves the answer and operation key after a network failure for a safe retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PracticeActivityForm
        activity={activity({ type: "fill-blank", placeholder: "Complete" })}
        action="/api/test"
        operationKey="operation-retry"
      />,
    );

    const answer = screen.getByRole("textbox", { name: "Sua resposta" });
    fireEvent.change(answer, { target: { value: "hello" } });
    const form = screen.getByRole("button", { name: "Responder" }).closest("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /mesma operação será reutilizada/i,
    );
    expect(answer).toHaveValue("hello");

    const firstBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(firstBody).toBeInstanceOf(FormData);
    expect((firstBody as FormData).get("operationKey")).toBe("operation-retry");
    expect((firstBody as FormData).get("answer")).toBe("hello");

    fireEvent.submit(form!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const retryBody = fetchMock.mock.calls[1]?.[1]?.body;
    expect(retryBody).toBeInstanceOf(FormData);
    expect((retryBody as FormData).get("operationKey")).toBe("operation-retry");
    expect((retryBody as FormData).get("answer")).toBe("hello");
  });
});
