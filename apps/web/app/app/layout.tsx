import { Button } from "@lingo-pilot/ui";
import type { ReactNode } from "react";
import { requireCurrentUser } from "../../server/auth/current-user";

type ProtectedLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  await requireCurrentUser();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <a className="app-brand" href="/app">
            LingoPilot
          </a>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="secondary">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="app-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
