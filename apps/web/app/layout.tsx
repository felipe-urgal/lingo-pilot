import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@lingo-pilot/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LingoPilot",
  description: "Seu caminho diário para aprender um idioma.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="lp-skip-link" href="#main-content">
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
