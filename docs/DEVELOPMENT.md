# Desenvolvimento

Este é o ponto de entrada canônico para instalar o LingoPilot, preparar o ambiente local, subir a aplicação, validar mudanças e preparar um PR.

Os contratos especializados continuam em:

- [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md): portas, profiles, Docker e isolamento local;
- [`RUNTIME_CONFIGURATION.md`](RUNTIME_CONFIGURATION.md): variáveis e fronteiras browser/server;
- [`DATABASE.md`](DATABASE.md): PostgreSQL, Drizzle, migrations e reset;
- [`QUALITY_STRATEGY.md`](QUALITY_STRATEGY.md): estratégia de testes e qualidade;
- [`REPOSITORY_GOVERNANCE.md`](REPOSITORY_GOVERNANCE.md): ruleset, CI e política de merge.

## Pré-requisitos

- Node.js 24.x;
- Corepack;
- pnpm `10.34.5` (fonte de verdade: `package.json#packageManager`);
- Docker Engine + Docker Compose.

## Primeira execução

```bash
nvm use
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
pnpm env:init
pnpm env:check
pnpm db:up
pnpm db:migrate
pnpm db:smoke
pnpm dev
```

Aplicação local:

```text
http://127.0.0.1:5400
```

`pnpm env:init` cria `.env.local` sem sobrescrever configuração existente. Nunca reutilize credenciais de Production em desenvolvimento ou testes.

## Ciclo normal de desenvolvimento

Depois de implementar a mudança e os testes correspondentes:

1. garanta o PostgreSQL local disponível com `pnpm db:up`, porque `pnpm check` executa integration tests via `TEST_DATABASE_URL`;
2. execute `pnpm dev` e valide manualmente o fluxo alterado quando aplicável;
3. execute o gate canônico do repositório:

```bash
pnpm check
```

`pnpm check` representa tudo que é sempre exigido antes do PR e executa:

```text
lint
-> typecheck
-> test
-> content:validate
-> build
```

`pnpm test` inclui unitários/estruturais e integração com PostgreSQL via `TEST_DATABASE_URL`.

O CI usa o mesmo `pnpm check` em ambiente limpo e sintético.

## Checks direcionados

Os checks abaixo permanecem explícitos quando o escopo justificar; não fazem parte do custo fixo de todo PR.

### Ambiente/runtime

Quando a mudança tocar configuração, profiles ou variáveis:

```bash
pnpm env:check
```

### Formatação

O hook local usa `pnpm format:staged`. Para auditoria explícita de formatação:

```bash
pnpm format:check
```

A formatação não é hoje um status obrigatório separado do CI.

### Banco/migrations

Para mudanças de schema/migration ou infraestrutura de banco, use conforme aplicável:

```bash
pnpm db:check
pnpm db:smoke
```

Comandos disponíveis:

```bash
pnpm db:up
pnpm db:down
pnpm db:reset
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:smoke
```

`db:reset` é destrutivo apenas para o volume local próprio do LingoPilot. Migrations aplicadas não devem ser reescritas; correções usam migration nova/forward-fix.

### E2E

Para mudanças de fluxo browser-first, autenticação, Today/Lesson Player ou regressões que justificam navegador real:

```bash
pnpm test:e2e
```

O Playwright usa `pnpm dev:e2e` internamente e a porta reservada `127.0.0.1:5401`. `dev:e2e` é parte do contrato E2E e deve permanecer.

O workflow `.github/workflows/e2e.yml` permite executar a mesma validação no GitHub Actions sem transformar E2E em custo fixo de todo PR. Ele é **opt-in** e roda quando:

- o workflow é disparado manualmente por `workflow_dispatch`;
- o título do PR contém `[e2e]`; ou
- o PR possui a label `run-e2e`.

Em PRs, o workflow faz checkout explícito do `head.sha`, sobe PostgreSQL efêmero, instala Chromium e executa `pnpm test:e2e`. Um push novo invalida a evidência anterior e dispara nova execução quando o PR continua opt-in.

O contexto `E2E / e2e` é evidência especializada por risco e **não** substitui nem amplia o ruleset obrigatório da `main`, que continua exigindo somente `CI / quality`.

### Coverage

Quando a análise de cobertura ajudar a investigar lacunas:

```bash
pnpm test:coverage
```

Coverage é diagnóstico, não meta percentual automática.

## CI e merge

O workflow permanente `.github/workflows/ci.yml` expõe o job obrigatório:

```text
CI / quality
```

O ruleset ativo da `main` exige o contexto `quality`. O job instala pelo lockfile, sobe PostgreSQL 17 efêmero e executa:

```bash
pnpm check
```

E2E, format check, environment check e database consistency/smoke continuam validações direcionadas por escopo, não contextos obrigatórios separados da `main` neste momento.

Qualquer push novo invalida a validação final anterior. O head que será mergeado deve ser o mesmo que passou pelo CI e pelo auto code review final.

## Fluxo de uma issue

```text
issue
-> branch dedicada
-> implementação + testes
-> pnpm db:up
-> migration quando aplicável
-> pnpm dev + validação manual quando aplicável
-> pnpm check
-> checks direcionados conforme risco
-> PR
-> CI / quality do head atual
-> auto code review completo
-> correções
-> CI final no novo head
-> merge
-> produção conforme docs/PRODUCTION.md quando aplicável
```

## Antes de declarar pronto

Confira também:

- [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md);
- [`DEVELOPMENT_WORKFLOW.md`](DEVELOPMENT_WORKFLOW.md);
- `AGENTS.md` na raiz do repositório.

Mudanças de produção, migrations reais, backup/restore ou readiness devem seguir [`PRODUCTION.md`](PRODUCTION.md).
