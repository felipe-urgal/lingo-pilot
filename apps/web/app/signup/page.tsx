import { Alert, Button, Input } from "@lingo-pilot/ui";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../server/auth/current-user";

type SignupPageProps = Readonly<{
  searchParams: Promise<{ error?: string | string[] }>;
}>;

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="shell" id="main-content">
      <section className="foundation auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">LingoPilot</p>
        <h1 id="signup-title">Criar conta</h1>
        <p className="description">
          Crie sua conta e configure sua primeira jornada de inglês em poucos passos.
        </p>

        {error === "invalid_input" ? (
          <Alert variant="danger">Informe um email válido e uma senha com pelo menos 8 caracteres.</Alert>
        ) : null}
        {error === "account_unavailable" ? (
          <Alert variant="danger">Não foi possível criar essa conta. Tente entrar ou use outro email.</Alert>
        ) : null}

        <form className="auth-form" action="/api/auth/signup" method="post">
          <Input
            autoComplete="email"
            id="email"
            inputMode="email"
            label="Email"
            name="email"
            required
            type="email"
          />
          <Input
            autoComplete="new-password"
            hint="Use pelo menos 8 caracteres."
            id="password"
            label="Senha"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <Button type="submit">Criar conta</Button>
        </form>
        <p className="auth-switch">
          Já tem conta? <a className="text-link" href="/login">Entrar</a>
        </p>
      </section>
    </main>
  );
}
