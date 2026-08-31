# LingoPilot

> Seu caminho diário para aprender um idioma.

LingoPilot é uma plataforma pessoal de aprendizado de idiomas orientada por progresso. A proposta central é simples: o aluno não precisa decidir o que estudar a cada dia. O sistema organiza a sessão diária, ensina conteúdo novo, revisa o que está prestes a ser esquecido, mede desempenho e adapta os próximos passos.

O primeiro recorte do produto é **Português (Brasil) → Inglês**, começando em **A0 absoluto** e avançando por **A1 e A2**. A arquitetura nasce preparada para novos idiomas e níveis sem transformar o domínio em um conjunto de exceções.

## Estado atual

O repositório está na fase de Foundation. O bootstrap técnico fornece o shell mínimo, CI permanente, governança da `main`, configuração de runtime validada e a foundation de persistência PostgreSQL/Drizzle. Ele **não** implementa ainda Study Engine, autenticação, conteúdo pedagógico real ou AI Tutor.

Stack inicial fixada:

- Node.js `24.x`;
- pnpm `10.34.5`;
- Turborepo `2.10.11`;
- Next.js `16.3.2`;
- React `19.2.8`;
- TypeScript `7.0.2` com `strict`;
- PostgreSQL `17` para desenvolvimento/integração;
- Drizzle ORM `0.45.2` e Drizzle Kit `0.31.10`;
- ESLint `10.9.1`;
- Prettier `3.9.6`.

## Primeira execução

Pré-requisitos: Node.js 24.x, Corepack, Docker Engine e Docker Compose.

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

`pnpm env:init` cria `.env.local` na raiz do repositório a partir de `.env.example` somente quando o arquivo ainda não existe; nunca sobrescreve configuração local existente. Se o arquivo foi criado antes da foundation de banco, adicione manualmente `DATABASE_URL` e `TEST_DATABASE_URL` seguindo `.env.example`. `pnpm env:check` valida o mesmo contrato usado pelos comandos de runtime.

Os comandos raiz que precisam de configuração, como `pnpm build`, `pnpm start`, `pnpm db:migrate`, `pnpm db:smoke` e os testes de integração, carregam explicitamente `.env.local` antes de iniciar processos filhos. Variáveis já fornecidas pelo shell, CI ou provider têm precedência sobre o arquivo local. O projeto não copia `.env.local` para `apps/web`.

Aplicação local:

```text
http://127.0.0.1:5400
```

O servidor E2E fica reservado para:

```text
http://127.0.0.1:5401
```

O PostgreSQL local é publicado exclusivamente em:

```text
127.0.0.1:5435
```

O LingoPilot **não escolhe outra porta automaticamente**. Se `5400` estiver ocupada, `pnpm dev` falha de forma explícita. O Compose também fixa `127.0.0.1:5435 -> postgres:5432`, preservando os PostgreSQL já usados por outros projetos. O contrato completo está em [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md).

## Comandos

| Comando                 | Função                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`              | inicia o web shell em `127.0.0.1:5400`                                     |
| `pnpm dev:e2e`          | inicia o web shell isolado em `127.0.0.1:5401`                             |
| `pnpm build`            | carrega env raiz e executa o build via Turborepo                           |
| `pnpm start`            | carrega env raiz e inicia o build produzido pelo web app                   |
| `pnpm env:init`         | cria `.env.local` de forma não destrutiva                                  |
| `pnpm env:check`        | valida configuração pública e server-only                                  |
| `pnpm db:up`            | sobe o PostgreSQL local isolado e aguarda healthcheck                      |
| `pnpm db:down`          | remove container/rede local preservando o volume                           |
| `pnpm db:reset`         | recria volume/bancos locais e reaplica migrations                          |
| `pnpm db:generate`      | gera migration/metadata Drizzle a partir do schema                         |
| `pnpm db:migrate`       | aplica migrations versionadas usando `DATABASE_URL`                        |
| `pnpm db:check`         | valida consistência do histórico de migrations                             |
| `pnpm db:smoke`         | testa conexão curta e timezone UTC                                         |
| `pnpm lint`             | valida scripts, testes, runtime config, app e packages                     |
| `pnpm typecheck`        | executa TypeScript strict nos packages aplicáveis                          |
| `pnpm test:unit`        | executa testes unitários/estruturais sem banco                             |
| `pnpm test:integration` | executa integração real contra `TEST_DATABASE_URL`                         |
| `pnpm test`             | executa unit + integration                                                  |
| `pnpm content:validate` | executa o hook estável de validação de conteúdo                            |
| `pnpm check:workspace`  | verifica packages esperados e restrições estruturais básicas               |
| `pnpm format`           | normaliza formatação com Prettier                                          |
| `pnpm format:check`     | verifica formatação sem alterar arquivos                                   |
| `pnpm check`            | gate agregado: format, env, lint, types, testes, migrations, conteúdo/build |

## Configuração de runtime

Configuração é tratada como contrato, não como acesso espalhado a `process.env`.

A fonte central é `@lingo-pilot/config/runtime/environment`. O web app possui duas entradas deliberadamente separadas:

```text
apps/web/config/public.ts  -> somente NEXT_PUBLIC_* seguro para browser
apps/web/config/server.ts  -> configuração de servidor/runtime
```

`DATABASE_URL` é server-only e obrigatória no runtime. Em desenvolvimento ela deve apontar para `127.0.0.1:5435`. `TEST_DATABASE_URL` é separada e só pode apontar para um banco explicitamente identificado como teste; a suíte de integração rejeita reutilização do banco de desenvolvimento.

A raiz do monorepo possui um carregador explícito de `.env.local` para comandos que iniciam subprocessos. Isso evita depender do diretório de trabalho de `apps/web` e garante que runtime, build e migrations usem o mesmo contrato sem duplicar arquivos de configuração.

`next.config.ts` carrega a configuração de servidor para que configuração inválida interrompa `dev`/`build` cedo. Validar `DATABASE_URL` não abre conexão nem executa migration durante import/build.

Contrato completo: [`docs/RUNTIME_CONFIGURATION.md`](docs/RUNTIME_CONFIGURATION.md). Operação do banco: [`docs/DATABASE.md`](docs/DATABASE.md).

## CI e governança

Pull requests para `main` executam o workflow permanente `CI` sem depender de secrets reais.

Status checks estáveis:

```text
CI / quality
CI / build
```

`CI / quality` usa instalação com lockfile frozen, sobe PostgreSQL efêmero isolado e executa format check, environment config, lint, typecheck, testes unitários, integration tests, consistência de migrations e content validation. `CI / build` roda somente depois do gate de qualidade e valida o build de produção sem executar migrations ou abrir conexão com banco.

Para reproduzir os gates que dependem de persistência localmente:

```bash
pnpm db:up
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
  config/               tooling + contrato tipado de configuração
  test-support/         suporte determinístico de testes
scripts/                checks e operações locais do repositório
tests/                  testes automatizados de Foundation
docs/                   produto, arquitetura e operação
```

Os packages nesta fase são **boundaries explícitos**. `@lingo-pilot/domain` não depende de Next.js, React, Drizzle ou providers externos. A primeira migration cria somente uma tabela técnica de metadata para provar o workflow de persistência sem antecipar o modelo do Study Engine.

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
- [`docs/RUNTIME_CONFIGURATION.md`](docs/RUNTIME_CONFIGURATION.md) — configuração pública/server-only, profiles e evolução;
- [`docs/DATABASE.md`](docs/DATABASE.md) — PostgreSQL, Drizzle, migrations, reset e testes de integração;
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
- [Configuração de runtime](docs/RUNTIME_CONFIGURATION.md)
- [PostgreSQL e Drizzle](docs/DATABASE.md)
- [Governança do repositório](docs/REPOSITORY_GOVERNANCE.md)
- [Observabilidade](docs/OBSERVABILITY.md)
- [Deploy e produção](docs/PRODUCTION_DEPLOYMENT.md)
- [Workflow de desenvolvimento](docs/DEVELOPMENT_WORKFLOW.md)
- [Definition of Done](docs/DEFINITION_OF_DONE.md)
