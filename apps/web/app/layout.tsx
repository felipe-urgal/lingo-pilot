import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@lingo-pilot/ui/styles.css";
import "./globals.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";

export const metadata: Metadata = {
  title: "LingoPilot",
  description: "Seu caminho diário para aprender um idioma.",
  manifest: "/manifest.webmanifest",
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
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
