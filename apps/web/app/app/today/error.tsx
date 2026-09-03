"use client";

import { Button } from "@lingo-pilot/ui";
import { useEffect } from "react";

export default function TodayError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error("today.load.failed", { name: error.name, digest: error.digest });
  }, [error]);

  return (
    <section className="today-card" role="alert" aria-labelledby="today-error-title">
      <p className="eyebrow">Hoje</p>
      <h1 id="today-error-title">Não foi possível carregar sua sessão.</h1>
      <p className="description">
        Sua matrícula e seu progresso foram preservados. Você pode tentar carregar
        novamente.
      </p>
      <Button type="button" onClick={reset}>
        Tentar novamente
      </Button>
    </section>
  );
}
