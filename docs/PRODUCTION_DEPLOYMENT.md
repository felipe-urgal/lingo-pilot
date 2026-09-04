# Contrato técnico de produção — LingoPilot

Este documento é a referência técnica aprofundada da topologia, migrations, health e recovery. O procedimento operacional do dia a dia está em [`PRODUCTION.md`](PRODUCTION.md); o estado factual/evidências fica em [`PRODUCTION_STATUS.md`](PRODUCTION_STATUS.md); incidentes usam [`runbooks/`](runbooks/README.md).

## 1. Topologia

```text
GitHub main / commit SHA
  -> Dev Dashboard Production Contract
  -> provider-deploy explícito via Vercel API
  -> Next.js / LingoPilot
  -> Neon PostgreSQL
```

Decisões vigentes:

- production branch/fonte versionada: `main`;
- aplicação: Vercel;
- estratégia do Production Contract: `git-managed`;
- gatilho de deployment: explícito pelo Dev Dashboard via API do provider;
- `vercel.json` mantém `git.deploymentEnabled=false` para todas as branches;
- banco: Neon PostgreSQL;
- ORM/query layer: Drizzle;
- migrations explícitas fora do build da Vercel;
- schema compatível antes de promover código que dependa dele;
- PostgreSQL nunca exposto como porta pública de aplicação;
- storage de speaking privado/S3-compatible somente quando a feature exigir;
- provider de IA deve degradar features opcionais sem derrubar o core determinístico.

ADRs: [`ADR/0002-production-deployment-topology.md`](ADR/0002-production-deployment-topology.md) e [`ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md`](ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md).

## 2. Invariantes

1. Production deploy parte de código versionado e de um SHA identificável.
2. `main` deve permanecer deployable, mas merge em `main` não significa deployment automático.
3. O provider-deploy deve promover deliberadamente o SHA/ref já validado.
4. O build não altera schema nem dados de Production.
5. Migration aplicada é imutável; correções usam nova migration/forward-fix.
6. Rollback de aplicação e rollback de banco são operações distintas.
7. Rollback de aplicação só é seguro com schema compatível.
8. Secrets não entram em Git, bundle cliente, issue, PR ou log compartilhado.
9. CI/Preview/local nunca usam banco de Production.
10. Health do provider não substitui readiness da aplicação.
11. Operação destrutiva exige confirmação, backup/checkpoint e plano de recuperação.
12. Efeito parcial/ambíguo exige `recovery_required`, preservação de evidência e investigação antes de retry.
13. Deploy automático da integração Git não deve ser reativado como workaround de quota/outage.

## 3. Ambientes

### Local

Fluxo canônico em [`DEVELOPMENT.md`](DEVELOPMENT.md). Portas/profiles detalhados em [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md).

Nunca reutilize credenciais de Production localmente.

### CI

- configuração sintética;
- PostgreSQL efêmero;
- sem secrets reais;
- `pnpm check` como gate obrigatório;
- checks especializados direcionados por risco/escopo.

### Preview

Deployments automáticos da integração Git estão desabilitados. Preview explícito/manual, quando necessário, usa configuração e banco não produtivos; a branch Neon `preview` nunca deve receber credenciais da `main`.

### Production

- Vercel Production Environment;
- Neon branch `main`;
- runtime com conexão pooled apropriada ao serverless;
- migration/backup com conexão administrativa direta separada;
- secrets de Production;
- observabilidade compatível com o risco do produto.

Nenhum ambiente infere credenciais de outro por fallback.

## 4. Gate antes da promoção

O gate de engenharia obrigatório do PR é:

```bash
pnpm check
```

Ele cobre:

```text
lint
-> typecheck
-> test
-> content:validate
-> build
```

Checks adicionais entram conforme o risco da mudança:

```bash
pnpm format:check
pnpm env:check
pnpm db:check
pnpm db:smoke
pnpm test:e2e
```

O preflight operacional `prod:check` permanece mais amplo e separado porque constrói ambiente isolado de check sem reutilizar configuração de Production.

## 5. Build da Vercel

Conceitualmente:

```bash
pnpm install --frozen-lockfile
pnpm build
```

`pnpm build` pode gerar artefatos/clientes necessários, mas não pode:

- aplicar migration de Production;
- executar schema push contra Production;
- criar/alterar dados reais;
- executar seed real;
- depender de credencial administrativa de migration.

## 6. Migrations

Migrations versionadas são a fonte de verdade do schema.

Nunca:

- editar migration já aplicada;
- corrigir Production manualmente sem versionar;
- substituir migration por schema push não auditável;
- fingir rollback reduzindo versão de migration;
- repetir migration em estado parcial desconhecido apenas para “ver se passa”.

### Expand -> deploy -> contract

Prefira evolução compatível:

```text
EXPAND: adiciona estrutura compatível
-> prod:migrate
DEPLOY: provider-deploy do novo código
-> janela de compatibilidade/backfill
CONTRACT: remove legado somente quando nenhuma versão depende dele
```

Quando código novo exige schema novo:

```text
PR/head final validado
-> revisar migration/SQL
-> backup/checkpoint quando aplicável
-> prod:migrate
-> confirmar schema saudável
-> main/SHA validado
-> Dev Dashboard provider-deploy
-> Vercel READY
-> prod:verify
```

Se migration falhar, não promova o código dependente. Use [`runbooks/migration-failure.md`](runbooks/migration-failure.md).

Mudança destrutiva exige issue explícita, compatibilidade, backup/checkpoint verificável, estratégia de backfill e recovery plan. Não crie migration destrutiva artificial apenas para ensaiar o runbook.

## 7. Interface operacional

```bash
pnpm prod:status
pnpm prod:prepare
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
pnpm prod:restore-check -- <backup.dump>
```

### `prod:status`

Somente leitura. Resume capacidade/configuração sem revelar secrets.

### `prod:prepare`

Hook de preparação local do Production Contract. Hoje executa `pnpm db:up`. Deve permanecer como alias estável porque o Dev Dashboard não precisa interpretar Docker/PostgreSQL.

### `prod:check`

Preflight isolado. Usa `CHECK_DATABASE_URL` e `CHECK_TEST_DATABASE_URL` distintos e não produtivos. Não recebe credenciais administrativas/provider nem faz fallback para Production.

### `prod:migrate`

Mutação explícita de Production. Exige `DATABASE_DIRECT_URL`, valida configuração sem imprimir segredo e executa migrations versionadas. Nunca é chamado por `pnpm build`.

### `prod:verify`

Somente leitura contra `LINGO_PRODUCTION_READY_URL` HTTPS. URL canônica atual:

```text
https://lingo-pilot.vercel.app/api/health/ready
```

### `prod:backup`

Cria backup PostgreSQL explícito em caminho ignorado pelo Git, sem colocar senha na linha de comando. Retenção/restore exercise ficam no runbook de backup.

### `prod:restore-check`

Restaura backup somente em banco não produtivo. Exige `RESTORE_CHECK_DATABASE_URL` e `RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check`; recusa endpoint de Production quando comparável e valida schema mínimo após restore.

### `provider-deploy`

Não é script local. É etapa do Dev Dashboard que aciona a Vercel por API para o projeto mapeado em `.dev-dashboard/production.json`. O operador deve confirmar ref/SHA e seguir [`runbooks/deploy.md`](runbooks/deploy.md).

## 8. Deployment explícito

Não existe `prod:deploy` local e a integração Git da Vercel não cria deployments automaticamente.

```text
main / SHA validado
-> Dev Dashboard
-> provider-deploy
-> Vercel Production Deployment
```

O Dev Dashboard pode observar provider/deployment/drift, mas não deve esconder uma promoção diferente do Production Contract nem usar `vercel --prod` como caminho paralelo.

O ADR 0006 supera a regra de deployment automático da `main` definida pelo ADR 0004.

## 9. Health e readiness

```text
GET /api/health/live
  -> 200 se a aplicação serve request

GET /api/health/ready
  -> 200 quando o core está pronto
  -> 503 quando PostgreSQL/schema crítico impede operação segura
```

Readiness considera PostgreSQL e schema mínimo esperado (`app_metadata`). Provider opcional de IA não deve tornar o core `503` se houver degradação segura.

Endpoints públicos retornam informação mínima; diagnóstico detalhado fica na observabilidade protegida.

## 10. Smoke pós-deploy

Após promoção:

1. confirmar commit SHA/deployment esperado;
2. validar `/api/health/live`;
3. validar `/api/health/ready`;
4. validar shell/rota pública principal;
5. validar fluxo alterado quando houver identidade sintética/controlada segura;
6. observar 5xx/erros estruturados;
7. registrar revision/deploy marker quando aplicável.

Provider `READY` não substitui `prod:verify`.

## 11. Backup, rollback e recovery

Política atual do Production Contract:

```text
backup = required-before-migration
migrations = before-deploy
rollback = provider-only-when-schema-compatible
```

Rollback de código só é seguro quando o schema atual continua compatível. Caso contrário, use forward-fix ou recovery coordenado.

Restore deve ser validado primeiro fora de Production. O backup local explícito não é, por si só, política durável de retenção; quando houver dados relevantes, siga a cadência/armazenamento do runbook.

Estado parcial desconhecido de migration/corrupção deve ser tratado como `recovery_required` até que o estado real seja estabelecido.

## 12. Secrets

Configuração administrativa real permanece fora do Git em:

```text
<Project.path>/.dev-dashboard/.env.production.local
```

Classes de privilégio permanecem separadas:

- runtime da aplicação: conexão pooled/least-privilege necessária ao app;
- migration/backup: conexão administrativa direta;
- provider deployment: credencial/conexão do Dev Dashboard com a Vercel.

Nunca registrar connection strings, tokens, credenciais de provider ou dumps reais em issue/PR/log compartilhado. Rotação segue [`runbooks/leaked-secret.md`](runbooks/leaked-secret.md).

## 13. Observabilidade operacional

Um incidente deve poder correlacionar sem PII/secrets:

- horário UTC;
- commit SHA;
- deployment id quando disponível;
- route/useCase;
- errorCode;
- requestId.

`VERCEL_GIT_COMMIT_SHA` e `VERCEL_DEPLOYMENT_ID`, quando disponíveis, alimentam a metadata estruturada existente. A issue #45 consome a baseline da #14 e não cria um sistema paralelo.

## 14. Dev Dashboard Production Contract

`.dev-dashboard/production.json` permanece ativo com:

```text
production.enabled = true
strategy = git-managed
provider = vercel
branch = main
external.project = lingo-pilot
documentation = docs/PRODUCTION.md
```

`git-managed` preserva `main`/SHA como fonte do release. O gatilho da Vercel é explícito pelo Dev Dashboard conforme ADR 0006.

Se a capacidade real regredir, o contrato deve falhar fechado até ser restaurado.

## 15. Runbooks

Entrada: [`runbooks/README.md`](runbooks/README.md).

Runbooks atuais cobrem deploy, migration failure, backup/restore, Vercel outage/quota, database outage, auth outage, leaked secret e data corruption. AI/storage outages só serão adicionados quando essas capabilities existirem.

## 16. Mudanças futuras

Mudança de hosting, banco, política de migration, backup/restore, health/readiness, trigger de deployment ou promoção deve atualizar no mesmo PR:

- [`PRODUCTION.md`](PRODUCTION.md);
- este contrato técnico;
- [`PRODUCTION_STATUS.md`](PRODUCTION_STATUS.md) quando a evidência factual mudar;
- runbooks afetados;
- ADR correspondente quando a decisão estrutural/operacional mudar.
