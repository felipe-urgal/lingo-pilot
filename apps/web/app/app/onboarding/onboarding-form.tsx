"use client";

import { Alert, Button, Input, Select } from "@lingo-pilot/ui";
import { useState } from "react";
import type {
  EntryPointLevel,
  PrimaryGoal,
} from "../../../../../packages/domain/src/index.ts";

type OnboardingFormProps = Readonly<{
  error?: string;
  initialDailyGoalMinutes: number;
  initialEntryPointLevel: EntryPointLevel;
  initialPrimaryGoal: PrimaryGoal | null;
  initialTimezone: string;
  isEditing: boolean;
}>;

const goalLabels: Readonly<Record<PrimaryGoal, string>> = {
  conversation: "Conversar com mais confiança",
  travel: "Viajar e resolver situações do dia a dia",
  work: "Usar inglês no trabalho",
  study: "Estudar e consumir conteúdo em inglês",
  other: "Outro objetivo",
};

export function OnboardingForm({
  error,
  initialDailyGoalMinutes,
  initialEntryPointLevel,
  initialPrimaryGoal,
  initialTimezone,
  isEditing,
}: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [timezone, setTimezone] = useState(initialTimezone || "UTC");
  const [entryPointLevel, setEntryPointLevel] = useState<EntryPointLevel>(
    initialEntryPointLevel,
  );
  const [route, setRoute] = useState<"zero" | "manual">(
    initialEntryPointLevel === "A0" ? "zero" : "manual",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  function nextStep() {
    setStep((current) => Math.min(3, current + 1));
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1));
  }

  function handleSubmit() {
    setIsSubmitting(true);
  }

  const effectiveEntryPoint =
    route === "zero" ? "A0" : entryPointLevel === "A0" ? "A1" : entryPointLevel;

  return (
    <form
      action="/api/onboarding"
      className="onboarding-form"
      method="post"
      onSubmit={handleSubmit}
    >
      <input name="interfaceLocale" type="hidden" value="pt-BR" />
      <input name="entryPointLevel" type="hidden" value={effectiveEntryPoint} />

      {error === "invalid_input" ? (
        <Alert variant="danger">
          Não foi possível salvar essas preferências. Revise os campos e tente
          novamente.
        </Alert>
      ) : null}

      <div className="onboarding-progress" aria-label="Progresso do onboarding">
        <span>
          Etapa {isEditing ? 1 : step} de {isEditing ? 1 : 3}
        </span>
      </div>

      <section hidden={!isEditing && step !== 1} aria-labelledby="goal-title">
        <h2 id="goal-title">Qual é seu principal objetivo?</h2>
        <p className="onboarding-copy">
          Isso ajuda a manter a experiência focada. Você pode ajustar depois.
        </p>
        <Select
          defaultValue={initialPrimaryGoal ?? ""}
          id="primaryGoal"
          label="Objetivo principal (opcional)"
          name="primaryGoal"
        >
          <option value="">Prefiro não escolher agora</option>
          {Object.entries(goalLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </section>

      <section
        hidden={!isEditing && step !== 2}
        aria-labelledby="routine-title"
      >
        <h2 id="routine-title">Quanto tempo cabe no seu dia?</h2>
        <p className="onboarding-copy">
          Uma meta pequena e repetível é melhor do que uma sessão difícil de
          manter.
        </p>
        <Select
          defaultValue={String(initialDailyGoalMinutes)}
          id="dailyGoalMinutes"
          label="Meta diária"
          name="dailyGoalMinutes"
          required
        >
          <option value="10">10 minutos</option>
          <option value="15">15 minutos</option>
          <option value="20">20 minutos</option>
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
        </Select>
        <Input
          autoComplete="off"
          id="timezone"
          label="Fuso horário"
          name="timezone"
          onChange={(event) => setTimezone(event.currentTarget.value)}
          required
          value={timezone}
        />
      </section>

      {!isEditing ? (
        <section hidden={step !== 3} aria-labelledby="entry-title">
          <h2 id="entry-title">De onde você quer começar?</h2>
          <p className="onboarding-copy">
            Escolher A1 ou A2 posiciona sua trilha, mas não conta como prova de
            domínio.
          </p>
          <fieldset className="choice-group">
            <legend className="sr-only">Ponto de entrada</legend>
            <label className="choice-card" htmlFor="entry-zero">
              <input
                aria-label="Começar do zero (A0)"
                checked={route === "zero"}
                id="entry-zero"
                name="entryRoute"
                onChange={() => setRoute("zero")}
                type="radio"
                value="zero"
              />
              <span>
                <strong>Começar do zero (A0)</strong>
                <small>Quero construir a base desde o início.</small>
              </span>
            </label>
            <label className="choice-card" htmlFor="entry-manual">
              <input
                aria-label="Já estudei antes"
                checked={route === "manual"}
                id="entry-manual"
                name="entryRoute"
                onChange={() => {
                  setRoute("manual");
                  if (entryPointLevel === "A0") setEntryPointLevel("A1");
                }}
                type="radio"
                value="manual"
              />
              <span>
                <strong>Já estudei antes</strong>
                <small>Quero escolher A1 ou A2 como ponto de entrada.</small>
              </span>
            </label>
          </fieldset>

          {route === "manual" ? (
            <fieldset className="level-options">
              <legend>Escolha seu ponto de entrada</legend>
              {(["A1", "A2"] as const).map((level) => {
                const id = `entry-level-${level.toLowerCase()}`;

                return (
                  <label htmlFor={id} key={level}>
                    <input
                      aria-label={level}
                      checked={entryPointLevel === level}
                      id={id}
                      name="manualEntryPointLevel"
                      onChange={() => setEntryPointLevel(level)}
                      type="radio"
                    />
                    <span>
                      <strong>{level}</strong>
                      {level === "A1"
                        ? " — já conheço o básico"
                        : " — já consigo lidar com estruturas básicas"}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}
        </section>
      ) : (
        <div className="placement-note">
          <strong>Ponto de entrada atual: {initialEntryPointLevel}</strong>
          <span>
            O ponto de entrada fica preservado; esta tela altera apenas suas
            preferências globais.
          </span>
        </div>
      )}

      <div className="onboarding-actions">
        {!isEditing && step > 1 ? (
          <Button type="button" variant="secondary" onClick={previousStep}>
            Voltar
          </Button>
        ) : null}
        {!isEditing && step < 3 ? (
          <Button
            key="continue"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              nextStep();
            }}
          >
            Continuar
          </Button>
        ) : (
          <Button
            key="submit"
            isLoading={isSubmitting}
            loadingLabel="Salvando"
            type="submit"
          >
            {isEditing ? "Salvar preferências" : "Começar minha jornada"}
          </Button>
        )}
      </div>
    </form>
  );
}
