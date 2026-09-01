# Status de produção

A topologia alvo do LingoPilot permanece definida em [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md): Vercel para aplicação, Neon PostgreSQL para dados e promoção `git-managed` pela branch `main`.

> **Estado atual:** ativação operacional em andamento pela issue #45. O Production Contract continua fail-closed até que Vercel, migrations, backup/restore e readiness estejam exercitados de ponta a ponta.

## Infraestrutura provisionada

Em 2026-09-01 foi provisionado um projeto Neon dedicado chamado `lingo-pilot-production`, PostgreSQL 18, com branch principal própria. Esse recurso é exclusivo de Production e não deve ser reutilizado por local, CI ou Preview.

A existência do recurso não remove sozinha o blocker `neon-production-not-validated`: ele só é considerado resolvido após migration, conectividade/readiness e restore-check serem validados.

O projeto Vercel real ainda precisa ser criado e ligado explicitamente a `felipe-urgal/lingo-pilot`; o Dev Dashboard não deve inferi-lo pelo nome do repositório.

## Interface operacional em implementação

A #45 introduz os comandos canônicos:

```bash
pnpm prod:status
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
pnpm prod:restore-check -- <backup.dump>
```

`prod:check` usa somente `CHECK_DATABASE_URL` e `CHECK_TEST_DATABASE_URL`, dois bancos de check distintos. Ele não carrega `.env.local` nem recebe `DATABASE_DIRECT_URL`, URL de readiness ou credenciais do provider.

As operações reais usam configuração local separada, destinada ao Dev Dashboard:

```text
<Project.path>/.dev-dashboard/.env.production.local
```

Variáveis operacionais previstas:

```text
DATABASE_DIRECT_URL=<conexão direta de migration/backup>
LINGO_PRODUCTION_READY_URL=https://<dominio>/api/health/ready
```

A conexão de runtime da aplicação continua sendo `DATABASE_URL` no ambiente Production da Vercel. O build não executa migrations.

## Health/readiness

A ativação implementa:

- `GET /api/health/live` — liveness mínima, sem diagnóstico sensível;
- `GET /api/health/ready` — readiness do core, validando conexão PostgreSQL e existência do schema mínimo (`app_metadata`).

Falha de PostgreSQL ou ausência do schema retorna `503`. Providers opcionais de IA não participam da readiness do core.

## Backup e restore-check

`prod:backup` gera dump PostgreSQL em `.dev-dashboard/backups/`, caminho ignorado pelo Git. A senha não é incluída na linha de comando do `pg_dump`.

`prod:restore-check` exige `RESTORE_CHECK_DATABASE_URL` cujo nome do database contenha `restore`, restaura o dump em ambiente não produtivo e valida a presença do schema mínimo. O Production Contract só pode ser habilitado depois que esse procedimento tiver sido executado com sucesso.

## Blockers que permanecem até a ativação final

- `vercel-project-not-configured` — criar e validar o projeto Vercel real, branch `main` e domínio canônico;
- `neon-production-not-validated` — aplicar migrations e validar runtime/readiness contra o Neon dedicado;
- `backup-dr-not-validated` — executar backup e restore-check real;
- `migration-flow-not-validated` — executar `prod:migrate` com a configuração administrativa separada;
- `production-health-not-configured` — validar `/api/health/live` e `/api/health/ready` no deployment Production.

`.dev-dashboard/production.json` continua `enabled=false` enquanto qualquer item acima não tiver evidência operacional. A transição final será para `strategy=git-managed`, `provider=vercel`, branch `main`, projeto Vercel explícito e comandos locais `check`, `migrate`, `verify`, `backup` e `restoreCheck`.
