#!/usr/bin/env node

import { productionReadyUrl } from "./production-environment.mjs";

try {
  const readyUrl = productionReadyUrl();
  console.log(`[prod:status] configurado: ${readyUrl.origin}${readyUrl.pathname}`);
} catch {
  console.log("[prod:status] configuração local de produção ainda não disponível.");
}
