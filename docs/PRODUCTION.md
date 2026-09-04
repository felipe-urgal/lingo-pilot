# Produção

Este é o ponto de entrada canônico para preparar, migrar, promover, verificar e recuperar o LingoPilot em produção.

A topologia ativa é **Vercel + Neon PostgreSQL**. A branch `main` continua sendo a fonte versionada do release, mas desde o PR #102 a integração Git da Vercel **não cria deployments automaticamente**: `vercel.json` mantém `git.deploymentEnabled=false`. A promoção é acionada explicitamente pelo Dev Dashboard via API do provider.

Não existe `prod:deploy` local.

Documentação especializada:

- [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md): contrato técnico de topologia, migrations, health e recovery;
- [`PRODUCTION_STATUS.md`](PRODUCTION_STATUS.md): estado factual e evidências da capacidade ativa;
- [`runbooks/README.md`](runbooks/README.md): procedimentos executáveis de release/incidente;
- [`ADR/0002-production-deployment-topology.md`](ADR/0002-production-deployment-topology.md): decisão de topologia;
- [`ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md`](ADR/0006-explicit-vercel-deployments-via-dev-dashboard.md): gatilho explícito de deploy atual.

## Visão rápida

```text
main / SHA validado
   ↓
pnpm prod:prepare
   ↓
pnpm prod:check
   ↓
pnpm prod:backup            # antes de migration quando aplicável
   ↓
pnpm prod:migrate           # quando houver migration necessária
   ↓
Dev Dashboard: provider-deploy (Vercel API)
   ↓
confirmar provider READY
   ↓
pnpm prod:verify
   ↓
smoke + observabilidade proporcional ao risco
```

`READY` do provider não substitui readiness da aplicação. Merge em `main` também não significa que Production já foi promovida.

## 1. Preparar o preflight local

O Production Contract expõe um hook explícito de preparação:

```bash
pnpm prod:prepare
```

Hoje ele executa `pnpm db:up` para garantir que o PostgreSQL local do próprio projeto esteja disponível para o check isolado.

Esse alias deve permanecer porque é parte do contrato consumido pelo Dev Dashboard; o consumidor não precisa conhecer Docker ou a implementação interna.

## 2. Preflight de produção

```bash
pnpm prod:check
```

`prod:check` é deliberadamente separado de `pnpm check` porque roda com ambiente de check isolado e fail-closed. Ele exige:

```text
CHECK_DATABASE_URL
CHECK_TEST_DATABASE_URL
```

Os dois bancos devem ser não produtivos e distintos. O comando não faz fallback para credenciais de Production e não recebe credenciais administrativas/provider.

O preflight cobre formatação, lint, typecheck, unit/integration, content validation, consistência de migrations e build em ambiente isolado.

## 3. Backup antes de migration

A política ativa exige backup antes de migration de Production:

```bash
pnpm prod:backup
```

O artefato local fica em `.dev-dashboard/backups/`, caminho ignorado pelo Git. Esse diretório não é considerado armazenamento durável de longo prazo. Credenciais e dumps nunca entram em issue/PR/log compartilhado.

Política de retenção, metadata e restore exercise: [`runbooks/backup-restore.md`](runbooks/backup-restore.md).

## 4. Migration de produção

O build da Vercel **não executa migration**.

Quando código novo depende de schema novo:

1. revise a migration exata e a compatibilidade;
2. confirme backup/checkpoint quando aplicável;
3. use configuração administrativa direta fora do Git;
4. execute:

```bash
pnpm prod:migrate
```

`prod:migrate` exige `DATABASE_DIRECT_URL` apropriada e aplica apenas migrations versionadas.

Prefira `expand -> deploy -> contract`. Migration aplicada é imutável; correções usam forward-fix.

Se a migration falhar ou o estado ficar ambíguo, **não** promova código dependente e **não** repita a operação cegamente. Trate o estado como `recovery_required` e siga [`runbooks/migration-failure.md`](runbooks/migration-failure.md).

## 5. Deployment explícito pelo Dev Dashboard

A promoção canônica é:

```text
main / SHA validado
-> Dev Dashboard Production
-> provider-deploy
-> Vercel API
-> Production Deployment
```

A integração Git da Vercel permanece desabilitada para todas as branches, inclusive `main`. Isso evita deployment duplicado e consumo desnecessário de quota quando o Dev Dashboard já executa a promoção explícita.

Não crie alias que esconda `git push`, não use `vercel --prod` como caminho paralelo e não reative Git deployment como workaround de quota/outage.

O manifesto `.dev-dashboard/production.json` continua com `strategy=git-managed`: nesse contrato, `main`/SHA é a fonte versionada do release. O gatilho do provider é explícito e pertence à orquestração do Dev Dashboard.

Procedimento completo: [`runbooks/deploy.md`](runbooks/deploy.md).

## 6. Verificação pós-deploy

Depois do deployment esperado ficar `READY`:

```bash
pnpm prod:verify
```

O comando consulta a readiness HTTPS canônica:

```text
https://lingo-pilot.vercel.app/api/health/ready
```

Para mudanças relevantes, valide também:

1. commit SHA/deployment esperado;
2. `/api/health/live`;
3. `/api/health/ready`;
4. shell/rota pública principal;
5. fluxo diretamente afetado quando houver identidade sintética/controlada segura;
6. 5xx e sinais de observabilidade do deployment novo.

## 7. Restore-check

Para validar um backup sem tocar Production:

```bash
pnpm prod:restore-check -- <backup.dump>
```

O comando exige `RESTORE_CHECK_DATABASE_URL` não produtiva e confirmação explícita:

```text
RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check
```

Ele recusa destino igual ao endpoint de Production quando essa comparação é possível e valida o schema mínimo após o restore.

Restore de emergência, cadência e critérios ficam em [`runbooks/backup-restore.md`](runbooks/backup-restore.md).

## 8. Rollback e recovery

Rollback de aplicação e rollback de banco são operações diferentes.

Rollback do provider só é seguro quando o schema atual continua compatível com o deployment anterior. Se uma migration já tornou o schema incompatível, prefira forward-fix ou recovery coordenado.

Estado parcial/ambíguo de migration, restore, corrupção ou outra mutação deve ser tratado como `recovery_required`: preserve evidência, interrompa novas mutações e determine o estado real antes de retry.

Runbooks relacionados:

- [`runbooks/migration-failure.md`](runbooks/migration-failure.md);
- [`runbooks/data-corruption.md`](runbooks/data-corruption.md);
- [`runbooks/database-outage.md`](runbooks/database-outage.md).

## 9. Interface operacional canônica

```bash
pnpm prod:status
pnpm prod:prepare
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
pnpm prod:restore-check -- <backup.dump>
```

Sem `prod:deploy` local. O `provider-deploy` é uma etapa do Dev Dashboard, não um script do repositório.

## 10. Resposta a incidentes

Procedimentos executáveis:

- deploy/smoke/rollback: [`runbooks/deploy.md`](runbooks/deploy.md);
- migration em falha: [`runbooks/migration-failure.md`](runbooks/migration-failure.md);
- backup/restore: [`runbooks/backup-restore.md`](runbooks/backup-restore.md);
- Vercel outage/quota: [`runbooks/vercel-outage.md`](runbooks/vercel-outage.md);
- PostgreSQL/Neon outage: [`runbooks/database-outage.md`](runbooks/database-outage.md);
- auth outage: [`runbooks/auth-outage.md`](runbooks/auth-outage.md);
- credencial vazada: [`runbooks/leaked-secret.md`](runbooks/leaked-secret.md);
- corrupção de dados: [`runbooks/data-corruption.md`](runbooks/data-corruption.md).

Todo incidente deve correlacionar, quando disponíveis, horário UTC, commit SHA, deployment id, route/useCase, errorCode e requestId. Não registrar secrets, cookies, email, payload livre do learner ou dump.

## 11. Dev Dashboard Production Contract

O manifesto versionado fica em:

```text
.dev-dashboard/production.json
```

Ele declara:

```text
strategy = git-managed
provider = vercel
branch = main
prepare = prod:prepare
check = prod:check
migrate = prod:migrate
verify = prod:verify
backup = prod:backup
restoreCheck = prod:restore-check
```

Configuração administrativa real permanece fora do Git em `.dev-dashboard/.env.production.local`.

Políticas ativas:

```text
backup = required-before-migration
migrations = before-deploy
rollback = provider-only-when-schema-compatible
```

Se a capacidade real deixar de ser verificável, não trate `production.enabled=true` como garantia abstrata; restaure a capacidade ou atualize o contrato de forma fail-closed.

## Desenvolvimento

Para setup local, execução da aplicação e gate antes do PR, use [`DEVELOPMENT.md`](DEVELOPMENT.md).
