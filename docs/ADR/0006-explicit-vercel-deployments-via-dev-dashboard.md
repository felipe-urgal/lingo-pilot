# ADR 0006 — Deployments explícitos da Vercel via Dev Dashboard

## Status

Aceito em 2026-09-04. Supera o ADR 0004 quanto ao gatilho automático de deployment.

## Contexto

O ADR 0004 limitou deployments automáticos da integração Git da Vercel à `main`. Em 2026-09-04, a conta Hobby atingiu a cota de deployments e o PR #102 desabilitou `git.deploymentEnabled` por completo. O LingoPilot já possuía o Dev Dashboard como orquestrador do Production Contract e o provider Vercel pode ser acionado explicitamente via API.

Manter simultaneamente o deploy automático da integração Git e o `provider-deploy` explícito pode produzir promoções duplicadas e consumir quota sem aumentar segurança.

## Decisão

- `vercel.json` mantém `git.deploymentEnabled=false`;
- push/merge no GitHub não cria deployment Vercel automaticamente, inclusive na `main`;
- `main` continua sendo a branch/fonte versionada do release;
- o Dev Dashboard executa explicitamente o provider-deploy da Vercel via API depois dos gates aplicáveis;
- o fluxo operacional passa a ser `check -> backup/migrate quando aplicável -> provider-deploy -> verify`;
- não existe `prod:deploy` local e `vercel --prod` não faz parte do caminho canônico;
- `strategy=git-managed` no Production Contract continua significando que o release é identificado/controlado por ref Git (`main`/SHA), não que um webhook da integração Git deve criar automaticamente o deployment;
- Preview continua somente explícito/manual e sempre isolado do banco de Production.

## Consequências

### Positivas

- uma promoção deliberada gera um único deployment esperado;
- quota do provider não é consumida por duplicidade entre Git integration e Dashboard;
- check/migration/provider-deploy/verify ficam no mesmo fluxo operacional observável;
- SHA do release continua auditável.

### Trade-offs

- merge em `main` não significa que Production foi promovida;
- indisponibilidade/quota do Dev Dashboard/Vercel pode atrasar uma promoção mesmo com `main` saudável;
- operação precisa distinguir “mergeado” de “deployed/verified”.

## Relação com ADRs anteriores

O ADR 0002 continua válido para topologia Vercel + Neon, migrations fora do build, isolamento de ambientes e compatibilidade de schema. O ADR 0004 permanece como registro histórico da política anterior, mas sua regra “deploy automático na main” está superada por esta decisão.

## Riscos e rollback

O risco principal é deixar documentação/operadores assumirem que merge em `main` promove automaticamente. Esse risco é mitigado por `docs/PRODUCTION.md`, `docs/PRODUCTION_STATUS.md`, runbook de deploy e teste estrutural.

Reativar deployment automático exige nova decisão/PR que atualize `vercel.json`, este ADR/status, runbooks e Production Contract se o vocabulário operacional mudar. Não deve ser usado como workaround de incidente/quota.

## Referências

- Issue #45
- PR #102
- ADR 0002 — Production deployment topology
- ADR 0004 — política automática anterior
- `vercel.json`
- `.dev-dashboard/production.json`
- `docs/runbooks/deploy.md`
