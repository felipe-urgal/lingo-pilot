# Status de produção

A topologia do LingoPilot segue o contrato definido em [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md): Vercel para aplicação, Neon PostgreSQL para dados e promoção `git-managed` pela branch `main`.

> **Estado atual:** Production capability habilitada em 2026-09-01 após validação real de check isolado, migration, deployment Vercel, readiness, backup e restore-check. O manifesto `.dev-dashboard/production.json` está ativo e mapeia explicitamente o projeto Vercel `lingo-pilot`.

## Infraestrutura validada

### Vercel

- projeto: `lingo-pilot`;
- repositório: `felipe-urgal/lingo-pilot`;
- production branch: `main`;
- aplicação Next.js em `apps/web`;
- domínio canônico: `https://lingo-pilot.vercel.app`;
- readiness canônica: `https://lingo-pilot.vercel.app/api/health/ready`;
- migrations permanecem fora do build da Vercel.

O ambiente Production da Vercel recebe apenas a configuração de runtime necessária. `DATABASE_URL` usa a conexão pooled do Neon. Credenciais administrativas de migration/backup não são colocadas no runtime da aplicação.

### Neon PostgreSQL

Em 2026-09-01 foi provisionado o projeto dedicado `lingo-pilot-production`, PostgreSQL 18, exclusivo de Production. Local, CI e Preview não reutilizam esse banco.

A primeira migration versionada foi aplicada com sucesso usando a conexão administrativa direta/unpooled. A readiness publicada confirmou conectividade com PostgreSQL e presença do schema mínimo `app_metadata`.

## Interface operacional validada

Os comandos canônicos são:

```bash
pnpm prod:status
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
pnpm prod:restore-check -- <backup.dump>
```

`prod:check` usa somente `CHECK_DATABASE_URL` e `CHECK_TEST_DATABASE_URL`, dois bancos de check distintos. Ele não carrega `.env.local` nem recebe credenciais administrativas/provider.

As operações reais usam configuração local separada:

```text
<Project.path>/.dev-dashboard/.env.production.local
```

Variáveis operacionais principais:

```text
DATABASE_DIRECT_URL=<conexão direta de migration/backup>
LINGO_PRODUCTION_READY_URL=https://lingo-pilot.vercel.app/api/health/ready
```

Restore-check usa adicionalmente `RESTORE_CHECK_DATABASE_URL` e a confirmação explícita `RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check`.

## Evidências da ativação de 2026-09-01

- `prod:check` concluído com dois bancos PostgreSQL locais isolados;
- conexão administrativa Direct/unpooled do Neon validada sem expor segredo;
- migration de produção aplicada com sucesso;
- backup PostgreSQL em formato custom criado com `prod:backup`;
- restore executado com sucesso em branch Neon descartável separado da `main`;
- validação pós-restore confirmou `app_metadata`;
- projeto Vercel criado e ligado ao GitHub/`main`;
- primeiro deployment Production ficou `Ready` no domínio canônico;
- `prod:verify` confirmou readiness real em produção.

## Health/readiness

- `GET /api/health/live` — liveness mínima, sem diagnóstico sensível;
- `GET /api/health/ready` — readiness do core, validando conexão PostgreSQL e existência de `app_metadata`.

Falha de PostgreSQL ou ausência do schema retorna `503`. Providers opcionais de IA não participam da readiness do core.

## Backup e restore-check

`prod:backup` gera dump PostgreSQL em `.dev-dashboard/backups/`, caminho ignorado pelo Git. A senha não entra na linha de comando do `pg_dump`.

`prod:restore-check` exige destino separado de Production e confirmação explícita. Quando `DATABASE_DIRECT_URL` também está presente, o comando compara host, porta e database e recusa executar se o destino do restore for o mesmo banco de produção. Após o restore, valida a presença do schema mínimo.

O primeiro exercício real de backup/restore foi concluído em branch Neon temporário e não alterou a branch de produção.

## Production Contract ativo

O manifesto do Dev Dashboard está habilitado com:

```text
strategy = git-managed
provider = vercel
branch = main
external.project = lingo-pilot
health = https://lingo-pilot.vercel.app/api/health/ready
```

Não existem mais blockers de ativação no manifesto. A issue #45 continua sendo a referência para hardening operacional mais amplo, incluindo runbooks e critérios adicionais de incident response que não são pré-requisito para manter a capability de Production habilitada.
