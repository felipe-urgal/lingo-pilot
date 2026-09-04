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

1. garanta o PostgreSQL local disponível com `pnpm db:up`, porque `pnpm check` sempre executa integration tests via `TEST_DATABASE_URL`;
2. execute `pnpm dev` e valide manualmente o fluxo alterado quando aplicável;
3. execute o gate canônico do repositório:

```bash
pnpm check
```

`pnpm check` executa:

```text
format:check
-> env:check
-> lint
-> typecheck
-> test
-> content:validate
-> db:check
-> build
```

`pnpm test` inclui unitários/estruturais e integração com PostgreSQL via `TEST_DATABASE_URL`.

O objetivo é ter uma única interface para tudo que é sempre obrigatório antes do PR. CI usa o mesmo `pnpm check` em ambiente limpo e sintético.

## Checks direcionados

Checks caros ou específicos continuam separados quando não são requisito de todo PR.

### E2E

Para mudanças de fluxo browser-first, autenticação, Today/Lesson Player ou regressões que justificam navegador real:

```bash
pnpm test:e2e
```

O Playwright usa `pnpm dev:e2e` internamente e a porta reservada `127.0.0.1:5401`. Não remova nem transforme `dev:e2e` em alias genérico: ele é parte do contrato E2E.

### Coverage

Quando a análise de cobertura ajudar a investigar lacunas:

```bash
pnpm test:coverage
```

Coverage é diagnóstico, não meta percentual automática.

### Banco

Comandos especializados:

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

## CI e merge

O workflow permanente `.github/workflows/ci.yml` expõe o job obrigatório:

```text
CI / quality
```

O ruleset ativo da `main` exige o contexto `quality`. O job instala pelo lockfile, sobe PostgreSQL 17 efêmero e executa:

```bash
pnpm check
```

E2E continua sendo validação direcionada por risco/escopo, não um contexto obrigatório separado da `main` neste momento.

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
-> pnpm test:e2e quando o risco justificar
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
