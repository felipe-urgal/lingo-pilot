import type { ReactNode } from "react";
import { requireCurrentUser } from "../../server/auth/current-user";

type ProtectedLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  await requireCurrentUser();

  return (
    <main className="app-shell">
      <header className="app-header">
        <strong>LingoPilot</strong>
        <form action="/api/auth/logout" method="post">
          <button className="secondary-button" type="submit">
            Sair
          </button>
        </form>
      </header>
      <div className="app-content">{children}</div>
    </main>
  );
}
