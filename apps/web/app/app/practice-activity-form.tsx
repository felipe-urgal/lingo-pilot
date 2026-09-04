"use client";

import { Button } from "@lingo-pilot/ui";
import { useState, type FormEvent } from "react";
import type { PracticeActivity } from "../../server/practice/activity-catalog";

type HiddenField = Readonly<{ name: string; value: string | number }>;

type PracticeActivityFormProps = Readonly<{
  activity: PracticeActivity;
  action: string;
  operationKey: string;
  hiddenFields?: readonly HiddenField[];
  submitLabel?: string;
}>;

function localizedText(text: Readonly<Record<string, string>>): string {
  return text["pt-BR"] ?? text.en ?? Object.values(text)[0] ?? "";
}

function AnswerFields({ activity }: Readonly<{ activity: PracticeActivity }>) {
  const presentation = activity.presentation;
  const promptId = `practice-prompt-${activity.content.id}`;

  switch (presentation.type) {
    case "single-choice":
    case "multiple-choice":
      return (
        <fieldset aria-describedby={promptId}>
          <legend>
            Escolha{" "}
            {presentation.type === "multiple-choice"
              ? "as respostas"
              : "uma resposta"}
          </legend>
          {presentation.choices.map((choice) => (
            <label key={choice.id} className="practice-option">
              <input
                name="answer"
                required={presentation.type === "single-choice"}
                type={
                  presentation.type === "single-choice" ? "radio" : "checkbox"
                }
                value={choice.id}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </fieldset>
      );
    case "fill-blank":
    case "short-answer":
    case "translation":
      return (
        <label className="practice-text-answer">
          <span>Sua resposta</span>
          <input
            aria-describedby={promptId}
            autoComplete="off"
            name="answer"
            placeholder={presentation.placeholder}
            required
            type="text"
          />
        </label>
      );
    case "word-order":
      return (
        <fieldset aria-describedby={promptId}>
          <legend>Monte a ordem</legend>
          <p className="description">
            Use os seletores abaixo. Eles são a alternativa por teclado ao
            arrastar e soltar.
          </p>
          {presentation.tokens.map((_, index) => (
            <label key={index} className="practice-order-position">
              <span>Posição {index + 1}</span>
              <select name="answer" required defaultValue="">
                <option value="" disabled>
                  Escolha um item
                </option>
                {presentation.tokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      );
    case "matching":
      return (
        <fieldset aria-describedby={promptId}>
          <legend>Faça as correspondências</legend>
          {presentation.pairs.map((pair) => (
            <label key={pair.leftId} className="practice-match-row">
              <span>{pair.leftLabel}</span>
              <select name={`match:${pair.leftId}`} required defaultValue="">
                <option value="" disabled>
                  Escolha a correspondência
                </option>
                {pair.rightChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      );
  }
}

export function PracticeActivityForm({
  activity,
  action,
  operationKey,
  hiddenFields = [],
  submitLabel = "Responder",
}: PracticeActivityFormProps) {
  const promptId = `practice-prompt-${activity.content.id}`;
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    setSubmitting(true);
    setNetworkError(false);

    try {
      const response = await fetch(action, {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
      });
      if (!response.ok || !response.redirected || !response.url) {
        throw new Error("Practice submission did not return a safe redirect");
      }
      window.location.assign(response.url);
    } catch {
      setSubmitting(false);
      setNetworkError(true);
    }
  }

  return (
    <form className="practice-activity" action={action} method="post" onSubmit={submit}>
      <input type="hidden" name="activityId" value={activity.content.id} />
      <input type="hidden" name="operationKey" value={operationKey} />
      {hiddenFields.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}

      <p className="eyebrow">Prática</p>
      <h2 id={promptId}>{localizedText(activity.content.prompt)}</h2>
      <AnswerFields activity={activity} />

      {activity.hints.length > 0 ? (
        <div className="practice-hints">
          <details>
            <summary>Ver dica</summary>
            <ul>
              {activity.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </details>
          <label>
            <input type="checkbox" name="hintUsed" value="1" /> Usei a dica
            nesta tentativa
          </label>
        </div>
      ) : null}

      {networkError ? (
        <p className="practice-feedback" role="alert">
          A conexão falhou. Sua resposta foi preservada; tente novamente. A
          mesma operação será reutilizada com segurança.
        </p>
      ) : null}

      <Button disabled={submitting} type="submit">
        {submitting ? "Enviando…" : submitLabel}
      </Button>
    </form>
  );
}
