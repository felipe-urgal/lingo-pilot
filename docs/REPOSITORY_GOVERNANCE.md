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

O workflow permanente é `.github/workflows/ci.yml` e publica dois checks visíveis no PR:

```text
CI / quality
CI / build
```

Os contextos usados internamente pelo ruleset do GitHub são:

```text
quality
build
```

`CI / quality` executa, nesta ordem:

1. checkout do commit do PR;
2. Node definido por `.nvmrc`;
3. package manager definido por `package.json#packageManager` via Corepack;
4. `pnpm install --frozen-lockfile`;
5. `pnpm format:check`;
6. `pnpm env:check`;
7. `pnpm lint`;
8. `pnpm typecheck`;
9. `pnpm test`;
10. `pnpm content:validate`.

`CI / build` só inicia após `quality` ficar verde e executa instalação frozen + `pnpm build`.

A separação é intencional: falhas de qualidade aparecem antes e evitam gastar minutos de runner com build inválido.

## 3. Ambiente sintético de CI

Os gates básicos não dependem de secrets. O workflow fornece apenas configuração segura e sintética:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
APP_TIMEZONE=UTC
LINGO_TEST_MODE=false
```

Isso permite validar o contrato de runtime e o build sem conectar banco, auth ou providers externos.

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

Enquanto a #15 não implementar schemas e referências, o hook confirma que o ponto de integração existe e informa explicitamente que validação editorial completa ainda está pendente.

Quando #15 entrar, o comando deve evoluir mantendo o mesmo nome para não quebrar CI/ruleset desnecessariamente.

## 7. Ruleset ativa da `main`

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

## 8. Merge policy

Política do repositório:

- squash merge como único método normal;
- merge commits desabilitados;
- rebase merge desabilitado;
- branch remota apagada automaticamente após merge;
- branches curtas e específicas por issue.

A `main` recebe um commit semântico por PR.

## 9. CODEOWNERS

Não adicionar `CODEOWNERS` nesta fase.

Com um único maintainer, ele não melhora roteamento de review e pode criar falsa impressão de revisão independente. Quando houver ownership real por área, adicionar junto da documentação da divisão.

## 10. Dependabot / Renovate

Não habilitar atualização automática de dependências nesta fase.

Razões:

- a Foundation ainda está estabilizando boundaries e contratos;
- PRs automáticos adicionariam ruído antes de existir política madura de upgrades;
- majors continuam exigindo avaliação explícita.

Atualizações manuais continuam obrigatórias quando necessárias por segurança ou compatibilidade.

## 11. Checks locais antes do push

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
build
```

CI continua sendo autoridade de integração porque roda em ambiente limpo e com instalação frozen.

## 12. Alterações de CI/configuração

Mudanças em `.github/workflows/**`, scripts de CI, `.nvmrc`, `packageManager`, runtime configuration, lint, TypeScript ou test runner exigem atenção especial no PR.

O auto review deve confirmar:

- contextos `quality`/`build` não mudaram sem coordenação do ruleset;
- permissões não aumentaram sem justificativa;
- instalação continua frozen;
- nenhuma secret foi adicionada ao caminho comum;
- configuração sintética de CI continua não sensível;
- timeout e concurrency continuam adequados;
- local e CI não divergiram silenciosamente;
- action pinning continua verificável.

Renomear check obrigatório é mudança de governança e deve atualizar workflow, ruleset e documentação de forma coordenada.

## 13. Falha ou indisponibilidade do CI

Não remover checks obrigatórios para contornar indisponibilidade transitória.

Procedimento:

1. identificar se é falha do código, runner ou GitHub Actions;
2. reexecutar apenas quando houver motivo para esperar resultado diferente;
3. corrigir flaky test/configuração em vez de adicionar retry global;
4. bypass é considerado emergência e não faz parte do fluxo normal; hoje o ruleset não possui bypass actors.

## 14. Evolução futura

Quando entrarem PostgreSQL, Playwright, schemas de conteúdo e evals, novos jobs podem surgir, mas o CI deve continuar dividido entre gates rápidos/obrigatórios e pipelines mais caros ou condicionais.

Integração PostgreSQL real, E2E e AI eval online não devem ser adicionados ao job `quality` sem avaliar custo, determinismo e necessidade de secrets.
