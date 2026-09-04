# Produção

Este é o ponto de entrada canônico para preparar, migrar, promover e verificar o LingoPilot em produção.

A topologia ativa é **Vercel + Neon PostgreSQL**, com promoção **git-managed pela branch `main`**. Não existe `prod:deploy` local.

Documentação especializada:

- [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md): contrato técnico detalhado de topologia, migrations, health e recovery;
- [`PRODUCTION_STATUS.md`](PRODUCTION_STATUS.md): estado factual e evidências da capacidade ativa;
- [`ADR/0002-production-deployment-topology.md`](ADR/0002-production-deployment-topology.md): decisão de topologia;
- [`ADR/0004-vercel-main-only-automatic-deployments.md`](ADR/0004-vercel-main-only-automatic-deployments.md): política de deployments automáticos.

## Visão rápida

```text
pnpm prod:prepare
-> pnpm prod:check
-> pnpm prod:backup            # antes de migration quando aplicável
-> pnpm prod:migrate           # quando houver migration necessária
-> merge/push em main
-> Vercel cria o Production Deployment
-> confirmar provider READY
-> pnpm prod:verify
-> smoke/observabilidade proporcional ao risco
```

`READY` do provider não substitui readiness da aplicação.

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

A política ativa exige backup antes de migration de produção:

```bash
pnpm prod:backup
```

O artefato fica em `.dev-dashboard/backups/`, caminho ignorado pelo Git. Credenciais não devem aparecer na linha de comando, logs, issue ou PR.

Para mudanças puramente de código sem migration, execute backup somente quando o risco operacional justificar.

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

Se a migration falhar ou o estado ficar ambíguo, não promova o código dependente e não repita a operação cegamente.

## 5. Deployment

Não existe `prod:deploy`.

A promoção é:

```text
merge/push em main
-> integração Git da Vercel
-> Production Deployment
```

Deployments automáticos de branches de trabalho estão desabilitados pelo contrato atual. Preview explícito, quando usado, deve permanecer isolado da branch Neon `main` de Production.

Não crie alias que esconda `git push`, `vercel --prod` ou outra promoção fora desse modelo.

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

1. commit/deployment esperado;
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

## 8. Rollback e recovery

Rollback de aplicação e rollback de banco são operações diferentes.

Rollback pela Vercel só é seguro quando o schema atual continua compatível com o deployment anterior. Se uma migration já tornou o schema incompatível, prefira forward-fix ou recovery coordenado conforme [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md).

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

Sem `prod:deploy` local.

## 10. Dev Dashboard Production Contract

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

## Desenvolvimento

Para setup local, execução da aplicação e gate antes do PR, use [`DEVELOPMENT.md`](DEVELOPMENT.md).
