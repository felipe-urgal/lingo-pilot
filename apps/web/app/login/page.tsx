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
    <main className="shell">
      <section className="foundation auth-card" aria-labelledby="login-title">
        <p className="eyebrow">LingoPilot</p>
        <h1 id="login-title">Entrar</h1>
        <p className="description">
          Use sua conta para acessar a área privada de estudo.
        </p>

        {hasInvalidCredentials ? (
          <p className="form-error" role="alert">
            Email ou senha inválidos.
          </p>
        ) : null}

        <form className="auth-form" action="/api/auth/login" method="post">
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              required
              type="email"
            />
          </label>

          <label>
            Senha
            <input
              autoComplete="current-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          <button type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
