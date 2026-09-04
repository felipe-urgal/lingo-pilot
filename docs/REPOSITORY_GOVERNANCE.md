# Governança do repositório — LingoPilot

Este documento define o contrato atual de governança do repositório GitHub do LingoPilot. Ele complementa `CONTRIBUTING.md`, `docs/DEVELOPMENT.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/QUALITY_STRATEGY.md` e `docs/DEFINITION_OF_DONE.md`.

## 1. Objetivo

A `main` deve permanecer integrável e deployable. Pull request é o caminho normal de mudança e nenhum merge deve depender apenas de confiança manual no autor.

A governança equilibra:

1. impedir regressões técnicas básicas;
2. manter o fluxo viável para um repositório pessoal com um único maintainer;
3. evitar automação cara, ruidosa ou dependente de secrets;
4. deixar os controles explícitos e auditáveis.

## 2. Workflow oficial de CI

O workflow permanente é `.github/workflows/ci.yml` e expõe um único job obrigatório no PR:

```text
CI / quality
```

O job executa:

1. checkout do commit do PR;
2. Node definido por `.nvmrc`;
3. package manager definido por `package.json#packageManager` via Corepack;
4. `pnpm install --frozen-lockfile`;
5. PostgreSQL `17-alpine` efêmero e isolado;
6. `pnpm check`.

`pnpm check` é a interface canônica do gate e executa:

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

`pnpm test` inclui unitários/estruturais e integration tests PostgreSQL.

Não manter listas paralelas de lint/typecheck/test/build no workflow. Se o gate obrigatório mudar, altere primeiro o script canônico e reconcilie CI/documentação no mesmo PR.

## 3. E2E e checks especializados

E2E não é hoje um contexto obrigatório separado da `main`.

Execute:

```bash
pnpm test:e2e
```

quando a mudança afetar fluxo browser-first crítico, autenticação, Today/Lesson Player ou quando uma regressão exigir navegador real.

AI eval online, performance/a11y avançados, security checks adicionais e verificações operacionais seguem o mesmo princípio: entram quando o risco/escopo justificar, não como custo fixo sem contrato material protegido.

## 4. Ambiente sintético de CI

O gate comum não depende de secrets reais. O workflow fornece configuração sintética, incluindo:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
APP_TIMEZONE=UTC
DATABASE_URL=postgresql://<synthetic>@127.0.0.1:5435/lingo_pilot_runtime
TEST_DATABASE_URL=postgresql://<synthetic>@127.0.0.1:5435/lingo_pilot_test
LINGO_TEST_MODE=false
```

O PostgreSQL do CI é efêmero e nunca representa Preview ou Production. Integration tests usam `TEST_DATABASE_URL`; build/config validation não devem abrir conexão nem executar migration de Production.

## 5. Segurança do GitHub Actions

Contrato mínimo:

- `GITHUB_TOKEN` com `contents: read` apenas no CI comum;
- gate obrigatório sem secrets reais;
- actions pinadas por commit SHA, com versão humana em comentário;
- timeout explícito;
- PRs antigos da mesma branch cancelados por `concurrency` quando um novo commit chega;
- push em `main` não cancelado por conveniência;
- não usar `pull_request_target` para CI comum;
- não executar código de fork com token de escrita.

## 6. Ruleset ativa da `main`

Estado validado em 2026-09-04:

```text
Name: main protection
Enforcement: Active
Target: default branch
Bypass actors: nenhum
```

Regras ativas:

- Restrict deletions;
- Block force pushes;
- Require a pull request before merging;
- Required approvals: `0` enquanto houver um único maintainer;
- Require conversation resolution before merging;
- Require status checks to pass;
- Require branches to be up to date before merging;
- Require linear history;
- Allowed merge method: somente `squash`.

Contexto obrigatório atual:

```text
quality
```

Não documentar `build` ou `e2e` como status obrigatório separado enquanto o ruleset/workflow real não os expuser dessa forma.

### Por que zero approvals?

Com um único maintainer, exigir aprovação humana tornaria PR próprio impossível sem bypass. O controle atual é:

- PR obrigatório;
- CI obrigatório;
- branch atualizada;
- threads resolvidas;
- auto code review documentado;
- sem bypass do ruleset.

Quando existir um segundo maintainer/reviewer real, reavaliar approvals.

## 7. Merge policy

- squash merge como único método normal;
- merge commits desabilitados;
- rebase merge desabilitado;
- branch remota removida após merge quando seguro;
- branches curtas e específicas por issue.

A `main` recebe um commit semântico por PR.

## 8. Checks locais antes do push

O fluxo canônico está em [`DEVELOPMENT.md`](DEVELOPMENT.md).

Com PostgreSQL local disponível quando necessário:

```bash
pnpm db:up
pnpm check
```

Quando o risco justificar navegador real:

```bash
pnpm test:e2e
```

CI continua sendo autoridade de integração porque roda instalação frozen e ambiente limpo/sintético.

## 9. Alterações de CI/configuração

Mudanças em `.github/workflows/**`, scripts de CI, `.nvmrc`, `packageManager`, runtime configuration, lint, TypeScript, banco ou test runner exigem atenção especial.

O auto review deve confirmar:

- o contexto obrigatório `quality` não mudou sem coordenação do ruleset;
- `pnpm check` continua representando tudo que é sempre obrigatório;
- permissões não aumentaram sem justificativa;
- instalação continua frozen;
- nenhuma secret entrou no caminho comum;
- bancos de CI/E2E continuam isolados de Preview/Production;
- timeout/concurrency continuam adequados;
- local e CI não divergiram silenciosamente;
- action pinning continua verificável.

Renomear o check obrigatório é mudança de governança e exige atualizar workflow, ruleset e documentação de forma coordenada.

## 10. Falha ou indisponibilidade do CI

Não remover checks obrigatórios para contornar indisponibilidade transitória.

Procedimento:

1. identificar se é falha do código, banco efêmero, runner ou GitHub Actions;
2. reexecutar somente quando houver motivo para esperar resultado diferente;
3. corrigir flaky test/configuração em vez de esconder com retry global;
4. não usar bypass como fluxo normal.

## 11. Content/database validation

`content:validate` e `db:check` fazem parte de `pnpm check` e, portanto, do gate obrigatório atual.

Evoluções de conteúdo e persistência devem preservar esses pontos de integração ou alterá-los de forma explícita no mesmo PR.

Integration tests continuam usando `TEST_DATABASE_URL` isolada. E2E usa seu próprio fluxo de reset/migration do banco de teste e não reutiliza Development, Preview ou Production.

## 12. CODEOWNERS e updates automáticos

Não adicionar `CODEOWNERS` enquanto não houver ownership real por área.

Não habilitar automação de dependências apenas por checklist. Upgrades relevantes continuam avaliados explicitamente, especialmente majors e mudanças de framework/ORM.

## 13. Produção

CI/Preview não podem usar credenciais ou banco de Production.

A promoção e as operações reais estão em [`PRODUCTION.md`](PRODUCTION.md). O Production Contract do Dev Dashboard permanece git-managed pela Vercel e migrations continuam explícitas fora do build.

## 14. Evolução futura

Novos jobs/checks devem ser adicionados apenas quando protegerem um contrato material que justifique custo e complexidade.

Se E2E voltar a ser obrigatório em todo PR, a mudança deve ser feita coordenadamente em workflow, ruleset, `QUALITY_STRATEGY.md`, `DEVELOPMENT.md` e este documento.
