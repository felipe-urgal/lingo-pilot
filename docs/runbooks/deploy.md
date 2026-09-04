# Runbook — deploy de produção

## Pré-condições

- o head que será promovido está em `main` e passou por `CI / quality`;
- `production.enabled=true` continua representando capacidade real;
- configuração administrativa permanece fora do Git em `.dev-dashboard/.env.production.local`;
- se houver migration, a ordem e a compatibilidade `expand → deploy → contract` foram revisadas;
- nenhuma migration anterior está em estado `recovery_required`.

## Procedimento

1. Sincronize a referência e registre o SHA esperado sem copiar secrets:

   ```bash
   git fetch origin main
   git rev-parse origin/main
   pnpm prod:status
   ```

2. Prepare e execute o preflight isolado:

   ```bash
   pnpm prod:prepare
   pnpm prod:check
   ```

3. Se o release exigir migration, crie o checkpoint e só então aplique a migration explicitamente:

   ```bash
   pnpm prod:backup
   pnpm prod:migrate
   ```

   Registre localmente o nome do artefato de backup, o SHA do release e o resultado, sem publicar credenciais ou o dump.

4. No Dev Dashboard, abra a capability Production do LingoPilot e execute a etapa `provider-deploy` para o projeto Vercel `lingo-pilot`. O deployment deve usar `main`/SHA já validado. Não use `vercel --prod` e não reative deploy automático da integração Git como atalho.

5. Quando o provider indicar `READY`, valide a aplicação:

   ```bash
   pnpm prod:verify
   ```

6. Faça smoke proporcional ao risco:

   - `GET /api/health/live` responde `200`;
   - `GET /api/health/ready` responde `200`;
   - shell/rota pública principal abre;
   - fluxo diretamente alterado funciona com identidade sintética/controlada quando aplicável;
   - logs estruturados não mostram spike de 5xx e permitem correlacionar commit/deployment/requestId sem PII.

## Sinais de sucesso

- SHA esperado e deployment do provider correspondem;
- Vercel mostra deployment `READY`;
- `pnpm prod:verify` termina com sucesso;
- liveness/readiness e smoke do fluxo alterado passam;
- não há sinal novo de erro relevante após a promoção.

## Sinais de falha

- provider criou deployment de SHA diferente;
- build/deployment falhou ou quota impediu a promoção;
- `prod:verify` falhou mesmo com provider `READY`;
- readiness retorna `503`;
- smoke funcional ou 5xx indica regressão.

## Critérios de decisão

- **Falha antes de migration:** pare a promoção, corrija o head e repita o preflight.
- **Migration falhou ou ficou ambígua:** não faça provider-deploy; siga [`migration-failure.md`](migration-failure.md).
- **Deployment falhou sem alterar banco:** siga [`vercel-outage.md`](vercel-outage.md) ou corrija o build.
- **Aplicação regrediu após deploy e schema continua compatível com o deployment anterior:** rollback do provider é permitido.
- **Schema já não é compatível com a versão anterior:** não faça rollback cego; prefira forward-fix coordenado.

## Recuperação

1. Preserve SHA, deployment id, horário UTC, resultado de `prod:verify` e códigos/requestIds seguros.
2. Se rollback de app for seguro, selecione explicitamente o deployment anterior no provider/Dev Dashboard e valide novamente `pnpm prod:verify` + smoke.
3. Se rollback não for seguro, mantenha o incidente em `recovery_required`, estabilize dependências e produza forward-fix compatível.
4. Não restaure banco apenas porque um deploy de aplicação falhou.

## Escalonamento

Escale quando houver migration parcial/ambígua, readiness persistentemente `503`, perda/corrupção de dados, credencial suspeita de vazamento ou impossibilidade de identificar com confiança SHA/deployment ativos.
