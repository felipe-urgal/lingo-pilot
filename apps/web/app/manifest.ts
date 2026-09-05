import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LingoPilot",
    short_name: "LingoPilot",
    description: "Seu caminho diário para aprender um idioma.",
    start_url: "/app/today",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
