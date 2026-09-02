import { Alert, Button, Input } from "@lingo-pilot/ui";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../server/auth/current-user";

type LoginPageProps = Readonly<{
  searchParams: Promise<{ error?: string | string[] }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  const params = await searchParams;
  const hasInvalidCredentials = params.error === "invalid_credentials";

  return (
    <main className="shell" id="main-content">
      <section className="foundation auth-card" aria-labelledby="login-title">
        <p className="eyebrow">LingoPilot</p>
        <h1 id="login-title">Entrar</h1>
        <p className="description">
          Use sua conta para acessar a área privada de estudo.
        </p>

        {hasInvalidCredentials ? (
          <Alert variant="danger">Email ou senha inválidos.</Alert>
        ) : null}

        <form className="auth-form" action="/api/auth/login" method="post">
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
            autoComplete="current-password"
            id="password"
            label="Senha"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <Button type="submit">Entrar</Button>
        </form>
      </section>
    </main>
  );
}
