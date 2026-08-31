# LingoPilot

> Seu caminho diário para aprender um idioma.

LingoPilot é uma plataforma pessoal de aprendizado de idiomas orientada por progresso. A proposta central é simples: o aluno não precisa decidir o que estudar a cada dia. O sistema organiza a sessão diária, ensina conteúdo novo, revisa o que está prestes a ser esquecido, mede desempenho e adapta os próximos passos.

O primeiro recorte do produto é **Português (Brasil) → Inglês**, começando em **A0 absoluto** e avançando por **A1 e A2**. A arquitetura nasce preparada para novos idiomas e níveis sem transformar o domínio em um conjunto de exceções.

## Estado atual

O repositório está na fase de Foundation. O bootstrap técnico fornece o shell mínimo e os limites de package necessários para as próximas issues; ele **não** implementa ainda Study Engine, autenticação, banco funcional, conteúdo real ou AI Tutor.

Stack inicial fixada:

- Node.js `24.x`;
- pnpm `10.34.5`;
- Turborepo `2.10.11`;
- Next.js `16.3.2`;
- React `19.2.8`;
- TypeScript `7.0.2` com `strict`;
- ESLint `10.9.1`;
- Prettier `3.9.6`.

## Primeira execução

Pré-requisitos: Node.js 24.x e Corepack.

```bash
nvm use
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Aplicação local:

```text
http://127.0.0.1:5400
```

O servidor E2E fica reservado para:

```text
http://127.0.0.1:5401
```

O LingoPilot **não escolhe outra porta automaticamente**. Se `5400` estiver ocupada, `pnpm dev` falha de forma explícita para proteger callbacks, origins, testes e documentação. O contrato completo está em [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md).

## Comandos

| Comando                 | Função                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| `pnpm dev`              | inicia o web shell em `127.0.0.1:5400`                              |
| `pnpm dev:e2e`          | inicia o web shell isolado em `127.0.0.1:5401`                      |
| `pnpm build`            | executa o build de produção via Turborepo                           |
| `pnpm lint`             | valida scripts, testes, app e packages                              |
| `pnpm typecheck`        | executa TypeScript strict nos packages aplicáveis                   |
| `pnpm test`             | executa os testes de bootstrap e valida boundaries                  |
| `pnpm content:validate` | executa o hook estável de validação de conteúdo                     |
| `pnpm check:workspace`  | verifica packages esperados e restrições estruturais básicas        |
| `pnpm format`           | normaliza formatação com Prettier                                   |
| `pnpm format:check`     | verifica formatação sem alterar arquivos                            |
| `pnpm check`            | gate local agregado: format, lint, typecheck, test, content e build |

## CI e governança

Pull requests para `main` executam o workflow permanente `CI` sem depender de secrets.

Status checks estáveis:

```text
CI / quality
CI / build
```

`CI / quality` usa instalação com lockfile frozen e executa format check, lint, typecheck, unit tests e content validation. `CI / build` roda somente depois do gate de qualidade e valida o build de produção.

O comando local equivalente é:

```bash
pnpm check
```

O contrato completo de branch protection, merge policy, segurança de Actions e evolução dos checks está em [`docs/REPOSITORY_GOVERNANCE.md`](docs/REPOSITORY_GOVERNANCE.md).

## Estrutura do monorepo

```text
apps/
  web/                  aplicação Next.js
packages/
  domain/               regras de negócio puras
  learning/             planner, mastery, SRS e progressão
  content/              schemas e validação de conteúdo
  db/                   persistência, schema e migrations
  ai/                   providers, prompts, guardrails e eval contracts
  ui/                   primitives compartilhados
  config/               ESLint e TypeScript compartilhados
  test-support/         suporte determinístico de testes
scripts/                checks estruturais do repositório
tests/                  testes do bootstrap
docs/                   produto, arquitetura e operação
```

Os packages nesta fase são **boundaries explícitos**, não implementações antecipadas. Em especial, `@lingo-pilot/domain` não pode depender de Next.js, React, Drizzle ou providers externos.

## Princípios do produto

1. **Hoje é a tela principal.** O produto deve responder imediatamente: “o que eu estudo agora?”.
2. **Progressão antes de quantidade.** Conteúdo só entra quando os pré-requisitos foram cumpridos ou quando um placement explícito concede elegibilidade sem fabricar mastery.
3. **Prática ativa.** Ler uma explicação não é suficiente; toda aprendizagem precisa gerar recuperação, produção e revisão.
4. **Revisão inteligente.** O sistema traz de volta o que o aluno está prestes a esquecer.
5. **IA com limites pedagógicos.** O tutor conhece o que o aluno realmente estudou e não assume domínio apenas por nível declarado.
6. **Simplicidade operacional.** A experiência deve ser rápida, clara e sem decisões desnecessárias para o aluno.
7. **Qualidade mensurável.** Conteúdo, software e respostas de IA precisam de validação, testes e critérios explícitos.

## Arquitetura

O projeto começa como **monólito modular**, não como microserviços. O objetivo é manter velocidade de desenvolvimento com limites de domínio claros e possibilidade de extração futura somente quando houver necessidade comprovada.

```text
UI / Delivery
    ↓
Application / Use cases
    ↓
Domain
    ↑
Infrastructure adapters
```

A direção completa está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e [`docs/ADR/0001-initial-architecture.md`](docs/ADR/0001-initial-architecture.md).

## Produção

A topologia inicial aprovada é:

```text
GitHub main
   ↓
Vercel Production
   ↓
Next.js / LingoPilot
   ↓
Neon PostgreSQL
```

Deploy é Git-managed, migrations ficam fora do build da Vercel e o projeto permanece orientado a custo recorrente zero enquanto os free tiers atenderem ao uso. Nenhum serviço pago recorrente deve ser introduzido sem decisão explícita.

Contrato operacional: [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md).

## Roadmap

- **Fase 0 — Foundation:** qualidade, arquitetura, CI, design system e modelos de domínio.
- **Fase 1 — Study Engine:** onboarding, conteúdo A0–A2, Today, aulas, exercícios, SRS e progresso.
- **Fase 2 — Skills + AI assessment foundation:** listening, reading, writing, speaking e infraestrutura/evals necessários às avaliações inteligentes.
- **Fase 3 — AI Tutor & Adaptation:** tutor contextual e prática adaptativa sobre a foundation validada.
- **Fase 4 — Product Hardening:** segurança, observabilidade, dados, performance e PWA/offline.
- **Fase 5 — Language Platform:** novos níveis/idiomas e generalização após validação do produto.

Veja [`docs/ROADMAP.md`](docs/ROADMAP.md) e [`docs/ISSUE_INDEX.md`](docs/ISSUE_INDEX.md).

## Desenvolvimento

Antes de alterar código, leia obrigatoriamente:

- [`AGENTS.md`](AGENTS.md) — contrato operacional para agentes de IA e desenvolvedores;
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — workflow de contribuição;
- [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md) — processo de desenvolvimento e revisão;
- [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md) — critérios mínimos de conclusão;
- [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) — contrato de portas e ambiente local;
- [`docs/REPOSITORY_GOVERNANCE.md`](docs/REPOSITORY_GOVERNANCE.md) — CI, branch protection e merge policy.

**Nenhuma funcionalidade é considerada pronta apenas porque funciona localmente.** Ela precisa estar coerente com o domínio, testada no nível adequado, revisada, observável quando necessário e documentada.

## Documentação principal

- [Visão do produto](docs/VISION.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Modelo de domínio](docs/DOMAIN_MODEL.md)
- [Learning Engine](docs/LEARNING_ENGINE.md)
- [Modelo de conteúdo](docs/CONTENT_MODEL.md)
- [UX e Design](docs/UX_AND_DESIGN.md)
- [Tutor de IA](docs/AI_TUTOR.md)
- [Segurança e privacidade](docs/SECURITY_PRIVACY.md)
- [Estratégia de qualidade](docs/QUALITY_STRATEGY.md)
- [Governança do repositório](docs/REPOSITORY_GOVERNANCE.md)
- [Observabilidade](docs/OBSERVABILITY.md)
- [Deploy e produção](docs/PRODUCTION_DEPLOYMENT.md)
- [Workflow de desenvolvimento](docs/DEVELOPMENT_WORKFLOW.md)
- [Definition of Done](docs/DEFINITION_OF_DONE.md)
