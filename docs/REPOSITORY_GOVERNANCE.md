# Governança do repositório — LingoPilot

Este documento define o contrato de governança do repositório GitHub do LingoPilot. Ele complementa `CONTRIBUTING.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/QUALITY_STRATEGY.md` e `docs/DEFINITION_OF_DONE.md`.

## 1. Objetivo

A `main` deve permanecer integrável. Pull request é o caminho normal de mudança e nenhum merge deve depender apenas de confiança manual no autor.

A governança precisa equilibrar quatro objetivos:

1. impedir regressões técnicas básicas;
2. manter o fluxo viável para um repositório pessoal com um único maintainer;
3. evitar automação cara, ruidosa ou dependente de secrets;
4. deixar os controles explícitos e auditáveis.

## 2. Workflow oficial de CI

O workflow permanente é `.github/workflows/ci.yml` e executa três jobs visíveis no PR:

```text
CI / quality
CI / e2e
CI / build
```

Os contextos diretamente exigidos pelo ruleset do GitHub continuam:

```text
quality
build
```

`e2e` é um gate intermediário obrigatório no grafo do workflow: ele depende de `quality`, e `build` depende de `quality + e2e`. Portanto, um E2E vermelho impede o check obrigatório `build` de ficar verde mesmo sem adicionar um terceiro contexto ao ruleset.

### `CI / quality`

Executa, nesta ordem:

1. checkout do commit do PR;
2. Node definido por `.nvmrc`;
3. package manager definido por `package.json#packageManager` via Corepack;
4. `pnpm install --frozen-lockfile`;
5. `pnpm format:check`;
6. `pnpm env:check`;
7. `pnpm db:smoke` contra PostgreSQL efêmero do job;
8. `pnpm lint`;
9. `pnpm typecheck`;
10. `pnpm test` — unitários/estruturais + integration tests PostgreSQL;
11. `pnpm db:check`;
12. `pnpm content:validate`.

O job sobe PostgreSQL `17-alpine` como service isolado, publicado apenas no runner em `5435`, usando credenciais sintéticas.

### `CI / e2e`

Só inicia depois de `quality` ficar verde e executa:

1. checkout e setup de Node/Corepack;
2. instalação frozen;
3. instalação do Chromium usado pelo Playwright;
4. `pnpm test:e2e` contra servidor reservado em `127.0.0.1:5401` e PostgreSQL efêmero próprio.

A suíte E2E usa banco explicitamente identificado como teste, reinicializado pelo harness antes da execução. Ela cobre fluxos browser-first críticos sem reutilizar Development, Preview ou Production.

### `CI / build`

Só inicia após `quality` e `e2e` ficarem verdes e executa:

1. checkout;
2. setup de Node/Corepack;
3. instalação frozen;
4. `pnpm build`;
5. verificação de que o build não alterou **arquivos rastreados** da working tree.

A separação é intencional: falhas de qualidade aparecem primeiro, E2E valida os fluxos críticos no browser e somente então o runner gasta tempo com o build final de produção.

## 3. Ambiente sintético de CI

Os gates básicos não dependem de secrets reais. O workflow fornece configuração segura e sintética, incluindo:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
APP_TIMEZONE=UTC
DATABASE_URL=postgresql://<synthetic>@127.0.0.1:5435/lingo_pilot_runtime
TEST_DATABASE_URL=postgresql://<synthetic>@127.0.0.1:5435/lingo_pilot_test
LINGO_TEST_MODE=false
```

O PostgreSQL de cada job que precisa de persistência é efêmero e nunca representa Production. `TEST_DATABASE_URL` é o destino dos integration/E2E tests; o smoke usa explicitamente o banco de teste do service. Build continua sem abrir conexão nem aplicar migration.

O profile E2E sobrescreve a configuração web para `127.0.0.1:5401`, `LINGO_PROFILE=e2e` e `LINGO_TEST_MODE=true` somente no processo correspondente.

## 4. Segurança do GitHub Actions

Contrato mínimo:

- `GITHUB_TOKEN` com `contents: read` apenas;
- checks básicos não dependem de secrets;
- actions reutilizadas devem ser pinadas por commit SHA, com versão humana indicada em comentário;
- jobs possuem timeout explícito;
- PRs antigos da mesma branch são cancelados por `concurrency` quando um novo commit chega;
- push em `main` não deve ser cancelado por outro push apenas por conveniência;
- não executar código de fork com token de escrita;
- não usar `pull_request_target` para CI comum.

Checkout e setup-node usam actions oficiais do GitHub pinadas por SHA.

## 5. Cache

Não há cache explícito nesta fase.

A instalação limpa é curta e o repositório ainda é pequeno. Cache de pnpm/Turbo pode ser adicionado quando medições mostrarem benefício claro, preservando lockfile como chave e evitando compartilhar artefatos mutáveis inseguros.

## 6. Content validation hook

`pnpm content:validate` é gate permanente desde Foundation.

A #15 implementou schemas, referências e validação do grafo mantendo o mesmo comando estável usado pelo CI. Evoluções de conteúdo devem preservar esse ponto de integração para não quebrar workflow/ruleset desnecessariamente.

## 7. Database validation baseline

A #10 adicionou a baseline real de persistência ao CI e as issues posteriores a estendem pelo mesmo contrato.

O contrato atual inclui:

- PostgreSQL efêmero por job que precisa de dados;
- smoke de conexão;
- integration tests usando `TEST_DATABASE_URL` isolada;
- E2E com banco de teste reinicializado e isolado;
- `pnpm db:check` para consistência de migrations;
- nenhuma migration/conexão durante o build da aplicação.

Qualquer mudança nesse contrato deve manter local, CI e `docs/DATABASE.md` sincronizados.

## 8. Ruleset ativa da `main`

O repositório possui o ruleset:

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
- Allowed merge method: somente `squash`;
- Additional approval for unattributed Copilot changes: desabilitado.

Checks obrigatórios do ruleset:

```text
quality
build
```

O job `e2e` não precisa ser um terceiro contexto obrigatório porque `build` possui dependência explícita de `e2e`; se o E2E falhar ou for cancelado, `build` não conclui com sucesso.

A configuração foi validada pela API do GitHub após a conclusão da #8.

### Por que zero approvals?

Com um único maintainer, exigir aprovação humana tornaria PR próprio impossível sem bypass. O controle correto nesta fase é:

- PR obrigatório;
- CI obrigatório;
- branch atualizada;
- threads resolvidas;
- auto code review documentado no PR;
- sem bypass do ruleset.

Quando existir um segundo maintainer/reviewer real, reavaliar `required_approving_review_count` para `1`.

## 9. Merge policy

Política do repositório:

- squash merge como único método normal;
- merge commits desabilitados;
- rebase merge desabilitado;
- branch remota apagada automaticamente após merge;
- branches curtas e específicas por issue.

A `main` recebe um commit semântico por PR.

## 10. CODEOWNERS

Não adicionar `CODEOWNERS` nesta fase.

Com um único maintainer, ele não melhora roteamento de review e pode criar falsa impressão de revisão independente. Quando houver ownership real por área, adicionar junto da documentação da divisão.

## 11. Dependabot / Renovate

Não habilitar atualização automática de dependências nesta fase.

Razões:

- a Foundation ainda está estabilizando boundaries e contratos;
- PRs automáticos adicionariam ruído antes de existir política madura de upgrades;
- majors continuam exigindo avaliação explícita.

Atualizações manuais continuam obrigatórias quando necessárias por segurança ou compatibilidade.

## 12. Checks locais antes do push

O comando canônico é:

```bash
pnpm check
```

Hoje inclui:

```text
format:check
env:check
lint
typecheck
test
content:validate
db:check
build
```

Para os checks que precisam de PostgreSQL local, execute antes:

```bash
pnpm db:up
```

Quando a mudança toca fluxo browser-first coberto por Playwright, execute também:

```bash
pnpm test:e2e
```

CI continua sendo autoridade de integração porque roda em ambiente limpo, com instalação frozen, PostgreSQL efêmero próprio e Chromium controlado para os E2E.

## 13. Alterações de CI/configuração

Mudanças em `.github/workflows/**`, scripts de CI, `.nvmrc`, `packageManager`, runtime configuration, lint, TypeScript, banco ou test runner exigem atenção especial no PR.

O auto review deve confirmar:

- contextos `quality`/`build` não mudaram sem coordenação do ruleset;
- dependência `quality → e2e → build` não foi enfraquecida silenciosamente;
- permissões não aumentaram sem justificativa;
- instalação continua frozen;
- nenhuma secret foi adicionada ao caminho comum;
- configuração sintética de CI continua não sensível;
- bancos de CI/E2E continuam isolados de Preview/Production;
- timeout e concurrency continuam adequados;
- local e CI não divergiram silenciosamente;
- action pinning continua verificável.

Renomear check obrigatório é mudança de governança e deve atualizar workflow, ruleset e documentação de forma coordenada.

## 14. Falha ou indisponibilidade do CI

Não remover checks obrigatórios para contornar indisponibilidade transitória.

Procedimento:

1. identificar se é falha do código, banco efêmero, runner, browser ou GitHub Actions;
2. reexecutar apenas quando houver motivo para esperar resultado diferente;
3. corrigir flaky test/configuração em vez de adicionar retry global;
4. bypass é considerado emergência e não faz parte do fluxo normal; hoje o ruleset não possui bypass actors.

## 15. Evolução futura

A baseline atual já inclui PostgreSQL/integration tests, schemas/validação de conteúdo e Playwright/E2E para fluxos críticos. Novos E2E devem entrar conforme o risco do fluxo, sem transformar cada detalhe visual em teste caro.

AI eval online e outros pipelines dependentes de providers/secrets entram conforme as issues correspondentes forem concluídas. Novos jobs devem continuar separados entre gates rápidos/obrigatórios e pipelines mais caros ou condicionais.
