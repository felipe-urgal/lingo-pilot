# Status de produção

Este documento registra o estado factual/evidências da capacidade de produção do LingoPilot. O procedimento operacional canônico está em [`PRODUCTION.md`](PRODUCTION.md); o contrato técnico detalhado permanece em [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md).

> **Estado atual:** Production capability habilitada desde 2026-09-01 após validação real de check isolado, migration, deployment Vercel, readiness, backup e restore-check. O manifesto `.dev-dashboard/production.json` está ativo e mapeia explicitamente o projeto Vercel `lingo-pilot`.

## Infraestrutura validada

### Vercel

- projeto: `lingo-pilot`;
- repositório: `felipe-urgal/lingo-pilot`;
- production branch: `main`;
- deployments automáticos da integração Git: somente `main`, conforme `vercel.json` e ADR 0004;
- aplicação Next.js em `apps/web`;
- domínio canônico: `https://lingo-pilot.vercel.app`;
- readiness canônica: `https://lingo-pilot.vercel.app/api/health/ready`;
- migrations permanecem fora do build da Vercel.

O ambiente Production da Vercel recebe somente configuração de runtime necessária. `DATABASE_URL` usa conexão pooled da branch Neon `main`; credenciais administrativas de migration/backup não ficam no runtime da aplicação.

Preview Deployments automáticos para branches de trabalho estão desabilitados. A branch Neon `preview` permanece isolada para Preview explícito/manual quando necessário e nunca deve receber a conexão da `main`.

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
- projeto Vercel ligado ao GitHub/`main`;
- Production Deployment `Ready` no domínio canônico;
- `prod:verify` com readiness real;
- isolamento de Preview sem acesso ao banco de Production.

## Health/readiness

- `GET /api/health/live` — liveness mínima;
- `GET /api/health/ready` — readiness do core, validando PostgreSQL e schema mínimo `app_metadata`.

Falha de PostgreSQL ou ausência do schema retorna `503`. Providers opcionais de IA não participam da readiness do core.

## Backup e restore-check

`prod:backup` gera dump em `.dev-dashboard/backups/`, caminho ignorado pelo Git. A senha não entra na linha de comando do `pg_dump`.

`prod:restore-check` exige destino não produtivo e confirmação explícita. Quando `DATABASE_DIRECT_URL` também está presente, o comando compara endpoint e recusa o mesmo banco de Production. Após restore, valida o schema mínimo.

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

Não existe `prod:deploy` local. A promoção continua sendo merge/push em `main` + integração Git da Vercel, seguida de `prod:verify`.

## Hardening futuro

A issue #45 continua referência para hardening operacional adicional que não é pré-requisito para manter a capability já validada. Mudanças futuras de provider, migration policy, backup/restore ou readiness devem atualizar [`PRODUCTION.md`](PRODUCTION.md), o contrato técnico e este status quando a evidência factual mudar.
