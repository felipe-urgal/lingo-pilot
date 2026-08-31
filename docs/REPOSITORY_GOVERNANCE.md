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

O workflow permanente é `.github/workflows/ci.yml` e publica dois status checks estáveis:

```text
CI / quality
CI / build
```

`CI / quality` executa, nesta ordem:

1. checkout do commit do PR;
2. Node definido por `.nvmrc`;
3. package manager definido por `package.json#packageManager` via Corepack;
4. `pnpm install --frozen-lockfile`;
5. `pnpm format:check`;
6. `pnpm lint`;
7. `pnpm typecheck`;
8. `pnpm test`;
9. `pnpm content:validate`.

`CI / build` só inicia após `quality` ficar verde e executa instalação frozen + `pnpm build`.

A separação é intencional: falhas de qualidade aparecem antes e evitam gastar minutos de runner com build inválido.

## 3. Segurança do GitHub Actions

Contrato mínimo:

- `GITHUB_TOKEN` com `contents: read` apenas;
- checks básicos não dependem de secrets;
- actions reutilizadas devem ser pinadas por commit SHA, com versão humana indicada em comentário;
- jobs possuem timeout explícito;
- PRs antigos da mesma branch são cancelados por `concurrency` quando um novo commit chega;
- push em `main` não deve ser cancelado por outro push apenas por conveniência;
- não executar código de fork com token de escrita;
- não usar `pull_request_target` para CI comum.

No bootstrap atual, checkout e setup-node são actions oficiais do GitHub pinadas por SHA.

## 4. Cache

Não há cache explícito nesta fase.

A instalação limpa observada no bootstrap é curta e o repositório ainda é pequeno. Introduzir cache agora aumentaria superfície de configuração sem ganho material. Cache de pnpm/Turbo pode ser adicionado quando medições mostrarem benefício claro, preservando lockfile como chave e evitando compartilhar artefatos mutáveis inseguros.

## 5. Content validation hook

`pnpm content:validate` é um gate permanente desde Foundation.

Enquanto a issue #15 ainda não implementou schemas e referências, o hook apenas confirma que o ponto de integração existe e informa explicitamente que validação editorial completa ainda está pendente.

Quando #15 entrar, o comando deve evoluir no mesmo nome. Isso evita alterar branch protection e CI apenas porque a implementação interna do validator mudou.

## 6. Configuração desejada da `main`

No momento da criação deste documento, a API disponível ao agente permite ler rulesets, mas não criar/alterar proteção de branch. Portanto, a configuração abaixo é parte manual e obrigatória da conclusão operacional da #8.

Criar um ruleset para a default branch em:

```text
Settings → Rules → Rulesets → New branch ruleset
```

Configuração recomendada:

```text
Name: main protection
Enforcement status: Active
Target branches: default branch
```

Ativar:

- Restrict deletions;
- Block force pushes;
- Require a pull request before merging;
- Required approvals: 0 enquanto houver um único maintainer;
- Require conversation resolution before merging;
- Require status checks to pass;
- Require branches to be up to date before merging;
- Require linear history.

Status checks obrigatórios:

```text
CI / quality
CI / build
```

### Por que zero approvals?

O repositório é atualmente mantido por uma única pessoa. Exigir uma aprovação humana tornaria PRs próprios impossíveis de concluir sem criar um bypass permanente, o que reduziria o valor do controle.

A política correta nesta fase é:

- PR obrigatório;
- CI obrigatório;
- threads resolvidas;
- auto code review documentado no PR;
- aprovação humana obrigatória passa a `1` quando existir um segundo maintainer/reviewer real.

## 7. Merge policy

Política desejada:

- squash merge como método padrão;
- evitar merge commits em PRs normais;
- evitar rebase merge para manter um único commit semântico por PR na `main`;
- apagar branch remota automaticamente após merge;
- branches curtas e específicas por issue.

Configuração em:

```text
Settings → General → Pull Requests
```

Desejado:

```text
Allow squash merging: ON
Allow merge commits: OFF
Allow rebase merging: OFF
Automatically delete head branches: ON
```

Se for necessário preservar múltiplos commits por uma razão excepcional, essa decisão deve ser explícita no PR; não deve ser o default do repositório.

## 8. CODEOWNERS

Não adicionar `CODEOWNERS` nesta fase.

Com um único maintainer, o arquivo não melhora roteamento de review e pode criar a falsa impressão de revisão independente. Quando houver mais de uma pessoa ou ownership real por área, adicionar `CODEOWNERS` no mesmo PR que documentar essa divisão.

## 9. Dependabot / Renovate

Não habilitar atualização automática de dependências nesta fase.

Razões:

- o bootstrap acabou de estabilizar versões explícitas;
- o projeto ainda está construindo seus gates e boundaries;
- PRs automáticos agora adicionariam ruído antes de existir uma política de atualização consolidada.

Reavaliar após Foundation, preferencialmente com agrupamento de updates de baixo risco e revisão explícita de majors.

Essa decisão não impede atualização manual de dependências quando necessária por segurança ou compatibilidade.

## 10. Checks locais antes do push

O comando canônico é:

```bash
pnpm check
```

Ele deve permanecer semanticamente alinhado ao CI rápido e hoje inclui:

```text
format:check
lint
typecheck
test
content:validate
build
```

CI continua sendo autoridade de integração porque roda em ambiente limpo e com instalação frozen.

## 11. Alterações de CI

Mudanças em `.github/workflows/**`, scripts usados pelo CI, `.nvmrc`, `packageManager`, lint, TypeScript ou test runner exigem atenção especial no PR.

O auto review deve confirmar:

- nome dos status checks não mudou sem necessidade;
- permissões não aumentaram sem justificativa;
- instalação continua frozen;
- nenhuma secret foi adicionada ao caminho comum;
- timeout e concurrency continuam adequados;
- local e CI não divergiram silenciosamente;
- action pinning continua verificável.

Se um check obrigatório precisar ser renomeado, atualizar primeiro a documentação e a ruleset de forma coordenada para não bloquear a `main`.

## 12. Falha ou indisponibilidade do CI

Não remover checks obrigatórios para contornar indisponibilidade transitória.

Procedimento:

1. identificar se é falha do código, runner ou GitHub Actions;
2. reexecutar apenas quando houver motivo para esperar resultado diferente;
3. corrigir flaky test ou configuração em vez de adicionar retry global;
4. bypass de proteção, quando tecnicamente inevitável, deve ser excepcional e documentado no PR/issue.

## 13. Evolução futura

Quando entrarem PostgreSQL, Playwright, schemas de conteúdo e evals, novos jobs podem surgir, mas o CI deve continuar dividido entre gates rápidos/obrigatórios e pipelines mais caros ou condicionais.

Integração PostgreSQL real, E2E e AI eval online não devem ser enfiados no job `quality` sem avaliar custo, determinismo e necessidade de secrets.
