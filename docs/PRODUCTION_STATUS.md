# Status de produção

A topologia alvo do LingoPilot continua definida em [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md): Vercel para aplicação, Neon PostgreSQL para dados e promoção `git-managed` pela branch `main`.

O Production Contract consumido pelo Dev Dashboard está **desabilitado por intenção**. Isso não significa que a arquitetura de produção foi abandonada; significa que o repositório ainda não possui evidência suficiente para anunciar capacidade operacional real.

## Blockers atuais

- `vercel-project-not-configured`: falta registrar e validar o identificador real do projeto Vercel; ele não será inferido pelo nome do repositório.
- `neon-production-not-validated`: falta validar o banco/branch Neon de produção e sua configuração server-side.
- `backup-dr-not-validated`: backup/checkpoint e procedimento de recuperação ainda não foram exercitados em produção.
- `migration-flow-not-validated`: migrations explícitas fora do build da Vercel ainda precisam do fluxo operacional real.
- `production-health-not-configured`: os endpoints `/api/health/live` e `/api/health/ready` e o smoke externo ainda não existem no produto atual.

Enquanto qualquer blocker permanecer, `.dev-dashboard/production.json` usa `enabled=false`, `strategy=disabled` e `provider=none`.

## Comandos canônicos atuais

`pnpm prod:status` é somente leitura e lista os blockers. `pnpm prod:check` falha de propósito para impedir que CI, operadores ou o Dev Dashboard confundam arquitetura planejada com produção pronta.

A futura ativação para `strategy=git-managed` exige um PR próprio que substitua os blockers por valores reais, adicione `prod:migrate`/`prod:verify` conforme o contrato normativo e demonstre o fluxo Vercel + Neon com testes e documentação.
