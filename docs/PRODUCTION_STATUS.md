# Status de produção

Este documento registra o estado factual/evidências da capacidade de produção do LingoPilot. O procedimento operacional canônico está em [`PRODUCTION.md`](PRODUCTION.md); o contrato técnico detalhado permanece em [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md); resposta a incidentes usa [`runbooks/`](runbooks/README.md).

> **Estado atual:** Production capability habilitada desde 2026-09-01 após validação real de check isolado, migration, deployment Vercel, readiness, backup e restore-check. Desde 2026-09-04 / PR #102, deployments automáticos da integração Git estão desabilitados e a promoção Vercel é acionada explicitamente pelo Dev Dashboard via API do provider.

## Infraestrutura validada

### Vercel

- projeto: `lingo-pilot`;
- repositório: `felipe-urgal/lingo-pilot`;
- branch/fonte versionada de Production: `main`;
- `vercel.json`: `git.deploymentEnabled=false` para todas as branches;
- promoção atual: `Dev Dashboard -> provider-deploy -> Vercel API`;
- aplicação Next.js em `apps/web`;
- domínio canônico: `https://lingo-pilot.vercel.app`;
- readiness canônica: `https://lingo-pilot.vercel.app/api/health/ready`;
- migrations permanecem fora do build da Vercel.

O ambiente Production da Vercel recebe somente configuração de runtime necessária. `DATABASE_URL` usa conexão pooled da branch Neon `main`; credenciais administrativas de migration/backup não ficam no runtime da aplicação.

Preview Deployments automáticos também estão desabilitados. A branch Neon `preview` permanece isolada para Preview explícito/manual quando necessário e nunca deve receber a conexão da `main`.

A política anterior de deployment automático somente na `main` está registrada historicamente no ADR 0004 e foi superada pelo ADR 0006 após o PR #102.

### Neon PostgreSQL

O projeto `lingo-pilot-production` usa PostgreSQL 18 com branches permanentes e isoladas:

- `main` — dados/schema de Production;
- `preview` — ambiente não produtivo reservado para Preview explícito/manual.

Local e CI usam bancos próprios e não reutilizam essas branches.

## Interface operacional validada

```bash
pnpm prod:status
pnpm prod:prepare
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
pnpm prod:restore-check -- <backup.dump>
```

Não existe `prod:deploy` local. `provider-deploy` é uma etapa do Dev Dashboard para o provider Vercel.

`prod:prepare` continua sendo hook real do Production Contract e executa `pnpm db:up` para preparar a fronteira local do preflight. Ele não deve ser removido apenas por parecer um wrapper fino: o Dev Dashboard conhece o alias, não Docker/PostgreSQL.

`prod:check` usa somente `CHECK_DATABASE_URL` e `CHECK_TEST_DATABASE_URL`, dois bancos distintos e não produtivos. Não carrega credenciais administrativas/provider e não faz fallback para Production.

Operações reais usam configuração local separada em:

```text
<Project.path>/.dev-dashboard/.env.production.local
```

Variáveis principais:

```text
DATABASE_DIRECT_URL=<conexão direta de migration/backup>
LINGO_PRODUCTION_READY_URL=https://lingo-pilot.vercel.app/api/health/ready
```

Restore-check usa adicionalmente `RESTORE_CHECK_DATABASE_URL` e `RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check`.

## Evidências da ativação

Em 2026-09-01 foram validados:

- `prod:check` com dois bancos PostgreSQL locais isolados;
- conexão administrativa Direct/unpooled do Neon sem exposição de segredo;
- migration de produção;
- backup PostgreSQL em formato custom;
- restore em branch Neon descartável separada da `main`;
- presença de `app_metadata` após restore;
- projeto Vercel ligado ao repositório/`main`;
- Production Deployment `Ready` no domínio canônico;
- `prod:verify` com readiness real;
- isolamento de Preview sem acesso ao banco de Production.

Em 2026-09-04 o PR #102 mudou apenas o **gatilho** de promoção:

- `git.deploymentEnabled=false` passou a impedir deployments automáticos por push/merge;
- o Dev Dashboard, que já orquestra o Production Contract, passou a acionar explicitamente o deployment Vercel via API;
- `main`/SHA continua sendo a fonte versionada do release;
- topologia Vercel + Neon, health/readiness e migrations explícitas não mudaram.

ADR: [`ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md`](ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md).

## Health/readiness

- `GET /api/health/live` — liveness mínima;
- `GET /api/health/ready` — readiness do core, validando PostgreSQL e schema mínimo `app_metadata`.

Falha de PostgreSQL ou ausência do schema retorna `503`. Providers opcionais de IA não participam da readiness do core.

## Backup e restore-check

`prod:backup` gera dump em `.dev-dashboard/backups/`, caminho ignorado pelo Git. A senha não entra na linha de comando do `pg_dump`.

`prod:restore-check` exige destino não produtivo e confirmação explícita. Quando `DATABASE_DIRECT_URL` também está presente, o comando compara endpoint e recusa o mesmo banco de Production. Após restore, valida o schema mínimo.

A política de hardening da #45 passa a exigir:

- backup antes de toda migration conforme o contrato ativo;
- metadata mínima de auditoria (timestamp UTC, SHA, migration head, checksum e retenção) para artefatos retidos;
- armazenamento criptografado em domínio de falha separado quando houver dados duráveis/relevantes;
- restore exercise trimestral antes de dados relevantes e mensal depois que Production tiver dados duráveis/relevantes, além de repetir após mudança material do mecanismo.

Detalhes: [`runbooks/backup-restore.md`](runbooks/backup-restore.md).

## Runbooks operacionais

A baseline ativa agora possui procedimentos para:

- deploy/smoke/rollback;
- migration failure + `recovery_required`;
- backup/restore;
- Vercel outage/quota;
- PostgreSQL/Neon outage;
- auth outage;
- leaked secret;
- data corruption.

Entrada: [`runbooks/README.md`](runbooks/README.md).

AI/storage outage continuam ausentes deliberadamente até essas capabilities existirem.

## Production Contract ativo

O manifesto do Dev Dashboard declara:

```text
strategy = git-managed
provider = vercel
branch = main
external.project = lingo-pilot
prepare = prod:prepare
health = https://lingo-pilot.vercel.app/api/health/ready
documentation = docs/PRODUCTION.md
```

Políticas:

```text
backup = required-before-migration
migrations = before-deploy
rollback = provider-only-when-schema-compatible
```

`git-managed` continua descrevendo a ref Git que define o release; não implica deployment automático da integração Git. A promoção corrente é `check -> backup/migrate quando aplicável -> provider-deploy -> verify` pelo Dev Dashboard.

## Estado do hardening #45

A capacidade inicial (#63–#65) permanece ativa. O recorte de hardening da #45 adiciona runbooks executáveis, política de recovery/backup, correlação operacional e reconcilia o gatilho explícito introduzido no #102.

Critérios que dependem de incidente real continuarão sendo validados por execução quando ocorrerem; o contrato de resposta e os checks estruturais ficam versionados desde já. Mudanças futuras de provider, migration policy, backup/restore, readiness ou gatilho de deploy devem atualizar [`PRODUCTION.md`](PRODUCTION.md), o contrato técnico, ADR/runbooks afetados e este status quando a evidência factual mudar.
