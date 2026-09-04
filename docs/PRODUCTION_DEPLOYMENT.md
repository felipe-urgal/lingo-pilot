# Contrato técnico de produção — LingoPilot

Este documento é a referência técnica aprofundada da topologia, migrations, health e recovery. O procedimento operacional do dia a dia está em [`PRODUCTION.md`](PRODUCTION.md); o estado factual/evidências fica em [`PRODUCTION_STATUS.md`](PRODUCTION_STATUS.md).

## 1. Topologia

```text
Internet
  -> HTTPS / Vercel
  -> Next.js / LingoPilot
  -> Neon PostgreSQL
```

Decisões vigentes:

- production branch: `main`;
- aplicação: Vercel integrada ao Git;
- estratégia: `git-managed`;
- banco: Neon PostgreSQL;
- ORM/query layer: Drizzle;
- migrations explícitas fora do build da Vercel;
- schema compatível antes de promover código que dependa dele;
- PostgreSQL nunca exposto como porta pública de aplicação;
- storage de speaking privado/S3-compatible quando a feature exigir;
- provider de IA deve degradar features opcionais sem derrubar o core determinístico.

ADR de topologia: [`ADR/0002-production-deployment-topology.md`](ADR/0002-production-deployment-topology.md).

## 2. Invariantes

1. Production deploy parte de código versionado.
2. `main` deve permanecer deployable.
3. Release deve ser identificável por commit SHA.
4. O build não altera schema nem dados de Production.
5. Migration aplicada é imutável; correções usam nova migration/forward-fix.
6. Rollback de aplicação e rollback de banco são operações distintas.
7. Rollback de aplicação só é seguro com schema compatível.
8. Secrets não entram em Git, bundle cliente, issue, PR ou log compartilhado.
9. CI/Preview nunca usam banco de Production.
10. Health do provider não substitui readiness da aplicação.
11. Operação destrutiva exige confirmação, backup/checkpoint e plano de recuperação.
12. Efeito parcial/ambíguo exige investigação antes de retry.

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

Deployments automáticos de branches de trabalho estão desabilitados pelo ADR 0004. Preview explícito/manual, quando necessário, usa configuração e banco não produtivos; a branch Neon `preview` nunca deve receber credenciais da `main`.

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

A simplificação do CI de 2026-09-04 removeu deliberadamente esses diagnósticos do custo fixo de todo PR. O preflight operacional `prod:check` continua mais amplo e separado porque constrói um **ambiente isolado de check**, sem reutilizar configuração de Production.

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
- fingir rollback reduzindo versão de migration.

### Expand -> deploy -> contract

Prefira evolução compatível:

```text
EXPAND: adiciona estrutura compatível
-> prod:migrate
DEPLOY: novo código passa a usar a estrutura
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
-> merge/promover código
-> Vercel READY
-> prod:verify
```

Se migration falhar, não promova o código dependente.

Mudança destrutiva exige issue explícita, compatibilidade, backup/checkpoint verificável, estratégia de backfill e recovery plan.

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

Ele é deliberadamente separado de `pnpm check` porque precisa construir ambiente fail-closed específico de preflight e pode executar validações adicionais de produção.

### `prod:migrate`

Mutação explícita de Production. Exige `DATABASE_DIRECT_URL`, valida configuração sem imprimir segredo e executa migrations versionadas. Nunca é chamado por `pnpm build`.

### `prod:verify`

Somente leitura contra `LINGO_PRODUCTION_READY_URL` HTTPS. URL canônica atual:

```text
https://lingo-pilot.vercel.app/api/health/ready
```

### `prod:backup`

Cria backup PostgreSQL explícito em caminho ignorado pelo Git, sem colocar senha na linha de comando.

### `prod:restore-check`

Restaura backup somente em banco não produtivo. Exige `RESTORE_CHECK_DATABASE_URL` e `RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check`; recusa endpoint de Production quando comparável e valida schema mínimo após restore.

## 8. Deployment git-managed

Não existe `prod:deploy` local.

```text
merge/push em main
-> integração Git da Vercel
-> Production Deployment
```

O Dev Dashboard pode observar provider/deployment/drift, mas não deve esconder `git push` ou `vercel --prod` dentro de um alias genérico.

ADR da política main-only: [`ADR/0004-vercel-main-only-automatic-deployments.md`](ADR/0004-vercel-main-only-automatic-deployments.md).

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

1. confirmar commit/deployment esperado;
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

Restore deve ser validado primeiro fora de Production.

## 12. Secrets

Configuração administrativa real permanece fora do Git em:

```text
<Project.path>/.dev-dashboard/.env.production.local
```

Nunca registrar connection strings, tokens, credenciais de provider ou dumps reais em issue/PR/log compartilhado.

## 13. Dev Dashboard Production Contract

`.dev-dashboard/production.json` permanece ativo com:

```text
production.enabled = true
strategy = git-managed
provider = vercel
branch = main
external.project = lingo-pilot
documentation = docs/PRODUCTION.md
```

A interface operacional e o provider mapping devem corresponder à realidade. Se a capacidade regredir, o contrato deve falhar fechado até ser restaurado.

## 14. Mudanças futuras

Mudança de hosting, banco, política de migration, backup/restore, health/readiness ou promoção deve atualizar no mesmo PR:

- [`PRODUCTION.md`](PRODUCTION.md);
- este contrato técnico;
- [`PRODUCTION_STATUS.md`](PRODUCTION_STATUS.md) quando a evidência factual mudar;
- ADR correspondente quando a decisão estrutural mudar.
