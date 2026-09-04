# Contribuindo com o LingoPilot

Este projeto trata qualidade de engenharia, produto e pedagogia como partes do mesmo trabalho. Toda contribuição deve começar por uma issue clara e terminar com um PR revisável, testado e documentado.

Comece por:

- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) para setup, execução local e gate antes do PR;
- [`docs/PRODUCTION.md`](docs/PRODUCTION.md) quando a mudança afetar deploy, migration, readiness ou operação.

## Fluxo padrão

1. Escolha ou crie uma issue.
2. Confirme critérios de aceite, dependências e riscos.
3. Crie uma branch a partir da `main` atualizada.
4. Implemente o menor conjunto coeso de mudanças que resolve a issue.
5. Suba/valide localmente o fluxo alterado quando aplicável.
6. Rode `pnpm check` e checks adicionais exigidos pelo risco/escopo.
7. Faça auto code review do diff.
8. Atualize documentação.
9. Abra PR usando o template oficial.
10. Corrija feedback e checks de CI.
11. Merge somente quando todos os critérios da Definition of Done estiverem atendidos.

## Branches

Use nomes curtos e descritivos:

```text
feature/daily-study-session
bugfix/review-queue-order
hotfix/auth-data-leak
docs/content-model
refactor/session-planner
test/lesson-player-e2e
```

Branches devem nascer da `main` atualizada e ser removidas após merge.

## Commits

Preferir Conventional Commits:

```text
feat: add daily study session planner
fix: prevent duplicate review submissions
docs: document content versioning
refactor: extract mastery calculation
test: cover lesson completion rollback
chore: configure CI typecheck
```

Commits devem ser semanticamente úteis e não incluir secrets ou artefatos temporários.

## Ambiente local

Na primeira execução:

```bash
pnpm env:init
pnpm env:check
pnpm db:up
```

`env:init` nunca sobrescreve `.env.local` existente. Configuração deve seguir `docs/RUNTIME_CONFIGURATION.md`; secrets e configuração server-only não podem vazar para módulos destinados ao browser.

A receita completa fica em [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Checks locais

Antes de abrir ou atualizar um PR:

```bash
pnpm check
```

O gate agregado inclui:

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

`pnpm test` inclui unitários/estruturais e integration tests PostgreSQL.

Checks adicionais entram conforme risco/escopo. Exemplo para fluxo browser-first relevante:

```bash
pnpm test:e2e
```

Não substitua check automatizado obrigatório por validação manual.

## Pull Requests

Um PR deve ser pequeno o suficiente para revisão cuidadosa e grande o suficiente para entregar uma unidade coerente de valor.

Evite:

- feature + refactor não relacionado;
- múltiplas issues sem relação;
- formatação massiva junto de mudança funcional;
- migration sem descrição de compatibilidade;
- UI sem evidência visual quando aplicável;
- mudança estrutural sem documentação.

PRs para `main` executam o status obrigatório atual:

```text
CI / quality
```

O job usa instalação frozen, PostgreSQL efêmero e executa o mesmo `pnpm check` usado localmente. O ruleset ativo exige o contexto `quality`.

E2E não é hoje um status obrigatório separado; execute-o quando o risco da mudança justificar.

Mudança no nome/contexto obrigatório exige coordenação com o ruleset e atualização de `docs/REPOSITORY_GOVERNANCE.md`.

## Critérios mínimos de revisão

O revisor deve procurar:

- correção do comportamento;
- alinhamento com critérios da issue;
- riscos de dados;
- autenticação e autorização;
- tratamento de falhas;
- acessibilidade;
- legibilidade;
- duplicação;
- testes significativos;
- observabilidade adequada;
- impacto pedagógico;
- atualização de docs.

Em repositório com um único maintainer, CI verde não substitui auto code review.

## Merge

O método padrão é squash merge. A `main` deve receber um commit semântico por PR.

A proteção da `main` exige PR, `quality` verde, branch atualizada e resolução de conversas, com zero approvals enquanto existir apenas um maintainer. Veja [`docs/REPOSITORY_GOVERNANCE.md`](docs/REPOSITORY_GOVERNANCE.md).

## Arquitetura

Não introduza novos frameworks, bancos, providers de autenticação/IA, filas ou serviços externos sem registrar a decisão quando houver impacto estrutural.

Mudanças de alto custo de reversão devem receber ADR em `docs/ADR/`.

## Documentação

Documentação não é etapa posterior. Se a implementação altera contrato, atualize no mesmo PR os entrypoints canônicos e os documentos especializados afetados.

## Segurança

Nunca commite:

- `.env` real;
- tokens;
- API keys;
- credenciais de banco;
- áudio ou dados pessoais de usuários reais;
- dumps de produção.

Use fixtures sintéticas em testes. GitHub Actions comum opera com least privilege e não depende de secrets para o gate básico.

## Definition of Done

Consulte [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md). Uma issue só deve ser fechada quando o comportamento estiver implementado, validado e documentado.
