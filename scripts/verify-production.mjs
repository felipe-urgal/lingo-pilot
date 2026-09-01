#!/usr/bin/env node

import { productionReadyUrl } from "./production-environment.mjs";

let readyUrl;
try {
  readyUrl = productionReadyUrl();
} catch (error) {
  console.error(
    `[prod:verify] configuração inválida: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const startedAt = Date.now();
const maxAttempts = 5;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const response = await fetch(readyUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (response.ok) {
      console.log(
        `Readiness de produção confirmado em ${attempt} tentativa(s) após ${Date.now() - startedAt} ms.`,
      );
      process.exit(0);
    }
  } catch {
    // Retry abaixo; não expomos URL/segredos no log.
  }

  if (attempt < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

console.error("[prod:verify] readiness de produção não ficou saudável.");
process.exit(1);
