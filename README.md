# LingoPilot

> Seu caminho diário para aprender um idioma.

LingoPilot é uma plataforma pessoal de aprendizado de idiomas orientada por progresso. A proposta central é simples: o aluno não precisa decidir o que estudar a cada dia. O sistema organiza a sessão diária, ensina conteúdo novo, revisa o que está prestes a ser esquecido, mede desempenho e adapta os próximos passos.

O primeiro recorte do produto é **Português (Brasil) → Inglês**, começando em **A0 absoluto** e avançando por **A1 e A2**. A arquitetura nasce preparada para novos idiomas e níveis sem transformar o domínio em um conjunto de exceções.

## Estado atual

O repositório concluiu a **Fase 0 — Foundation**. As issues #7–#16 entregaram bootstrap do monorepo/web shell, CI/governança da `main`, contrato de runtime local, foundation PostgreSQL/Drizzle, autenticação/autorização por ownership, boundaries executáveis, design system, observabilidade, schemas versionados de conteúdo com pipeline de validação e infraestrutura determinística de testes.

O projeto **não** implementa ainda o Study Engine, onboarding/signup público, conteúdo pedagógico real ou AI Tutor. A baseline de auth já possui login/logout sobre credenciais persistidas, sessão server-side e shell privado; criação pública de conta pertence à #17.

Stack inicial fixada:

- Node.js `24.x`;
- pnpm `10.34.5`;
- Turborepo `2.10.11`;
- Next.js `16.3.4`;
- React `19.2.8`;
- TypeScript `7.0.2` com `strict`;
- PostgreSQL `17` para desenvolvimento/integração;
- Drizzle ORM `0.45.2` e Drizzle Kit `0.31.10`;
- ESLint `10.9.1`;
- Prettier `3.9.6`.

O status operacional e a sequência do backlog ficam em [`docs/ISSUE_INDEX.md`](docs/ISSUE_INDEX.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).

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

```text
pnpm dev               web shell em 127.0.0.1:5400
pnpm dev:e2e           web shell isolado em 127.0.0.1:5401
pnpm build             build via Turborepo com env raiz
pnpm start             inicia o build produzido pelo web app
pnpm env:init          cria .env.local de forma não destrutiva
pnpm env:check         valida configuração pública e server-only
pnpm db:up             sobe PostgreSQL local e aguarda healthcheck
pnpm db:down           remove container/rede preservando o volume
pnpm db:reset          recria volume/bancos e reaplica migrations
pnpm db:generate       gera migration/metadata Drizzle
pnpm db:migrate        aplica migrations via DATABASE_URL
pnpm db:check          valida o histórico de migrations
pnpm db:smoke          testa conexão curta e timezone UTC
pnpm lint              valida scripts, testes, app e packages
pnpm typecheck         executa TypeScript strict
pnpm test:unit         executa unitários/estruturais via node:test + Vitest
pnpm test:coverage     gera coverage informativo do Vitest
pnpm test:integration  executa integração via TEST_DATABASE_URL
pnpm test:e2e          executa smoke Playwright isolado em 127.0.0.1:5401
pnpm test              executa unit + integration
pnpm content:validate  valida schemas e integridade do grafo de conteúdo JSON
pnpm check:workspace   valida boundaries estruturais
pnpm format            normaliza formatação com Prettier
pnpm format:check      verifica formatação sem alterar arquivos
pnpm check             gate agregado do repositório
pnpm prod:status       mostra o contrato/status operacional de produção
pnpm prod:check        executa preflight isolado sem mutar produção
pnpm prod:migrate      aplica migrations de produção explicitamente
pnpm prod:verify       valida readiness HTTPS de produção
pnpm prod:backup       cria backup PostgreSQL explícito
pnpm prod:restore-check -- <backup.dump>  restaura/valida backup em banco não produtivo
```

## Configuração de runtime

Configuração é tratada como contrato, não como acesso espalhado a `process.env`.

A fonte central é `@lingo-pilot/config/runtime/environment`. O web app possui duas entradas deliberadamente separadas:

```text
apps/web/config/public.ts  -> somente NEXT_PUBLIC_* seguro para browser
apps/web/config/server.ts  -> configuração de servidor/runtime
```

`DATABASE_URL` é server-only e obrigatória no runtime. Em desenvolvimento ela deve apontar para `127.0.0.1:5435`. `TEST_DATABASE_URL` é separada e só pode apontar para um banco explicitamente identificado como teste; a suíte de integração rejeita reutilização do banco de desenvolvimento.

A baseline de autenticação não adiciona secret de provider. Credenciais e sessões são persistidas no PostgreSQL; o token bruto de sessão fica apenas no cookie `HttpOnly` e o banco armazena seu hash.

A raiz do monorepo possui um carregador explícito de `.env.local` para comandos que iniciam subprocessos. Isso evita depender do diretório de trabalho de `apps/web` e garante que runtime, build e migrations usem o mesmo contrato sem duplicar arquivos de configuração.

`next.config.ts` carrega a configuração de servidor para que configuração inválida interrompa `dev`/`build` cedo. Validar `DATABASE_URL` não abre conexão nem executa migration durante import/build.

Contratos: [`docs/RUNTIME_CONFIGURATION.md`](docs/RUNTIME_CONFIGURATION.md), [`docs/DATABASE.md`](docs/DATABASE.md) e [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md).

## CI e governança

Pull requests para `main` executam o workflow permanente `CI` sem depender de secrets reais.

Status checks estáveis:

```text
CI / quality
CI / build
```

`CI / quality` usa instalação com lockfile frozen, sobe PostgreSQL 17 efêmero isolado e executa format check, environment config, smoke de banco, lint, typecheck, testes unitários + integração, consistência de migrations e content validation. `CI / build` roda somente depois do gate de qualidade ficar verde e valida o build de produção, além de confirmar que comandos oficiais não alteraram arquivos rastreados.

Para reproduzir os gates que dependem de persistência localmente:

```bash
pnpm db:up
pnpm check
```

O contrato completo de branch protection, merge policy, segurança de Actions e evolução dos checks está em [`docs/REPOSITORY_GOVERNANCE.md`](docs/REPOSITORY_GOVERNANCE.md).

## Estrutura do monorepo

```text
apps/
  web/                  aplicação Next.js + delivery/auth server-side
packages/
  domain/               regras de negócio puras
  learning/             planner, mastery, SRS e progressão
  content/              schemas versionados + parser/validação de conteúdo
  db/                   persistência, schema, migrations, auth/ownership data
  ai/                   providers, prompts, guardrails e eval contracts
  ui/                   primitives compartilhados
  config/               tooling + contrato tipado de configuração
  test-support/         suporte determinístico de testes
scripts/                checks e operações locais do repositório
tests/                  testes automatizados de Foundation
docs/                   produto, arquitetura e operação
```

Os packages nesta fase são **boundaries explícitos**. `@lingo-pilot/domain` não depende de Next.js, React, Drizzle ou providers externos. A migration `0000` cria a metadata técnica da foundation; a #11 acrescenta identidade, credencial, sessão server-side e fixture de ownership sem antecipar o modelo pedagógico.

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

Autenticação segue a mesma direção: delivery resolve identidade via `AuthAdapter`; domínio não conhece cookie, senha, token ou provider. Ownership é aplicado no servidor nas queries de recurso.

A direção completa está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md), [`docs/ADR/0001-initial-architecture.md`](docs/ADR/0001-initial-architecture.md) e [`docs/ADR/0003-first-party-auth-session.md`](docs/ADR/0003-first-party-auth-session.md).

## Produção

A topologia operacional é:

```text
GitHub main
   ↓
Vercel Production
   ↓
Next.js / LingoPilot
   ↓
Neon PostgreSQL
```

Essa topologia está ativa desde **2026-09-01**. A #63 implementou os comandos operacionais, backup/restore-check e health/readiness; a #64 ativou o Production Contract depois de validar Vercel, Neon, migration, readiness, backup e restore real; a #65 alinhou o manifesto ativo ao contrato do Dev Dashboard.

O deploy é `git-managed` pela `main`, migrations permanecem explícitas e fora do build da Vercel, Production usa a branch Neon `main` e Preview usa a branch Neon `preview` isolada. Configuração administrativa de migration/backup continua fora do runtime e fora do Git.

O projeto permanece orientado a custo recorrente zero enquanto os free tiers atenderem ao uso. Nenhum serviço pago recorrente deve ser introduzido sem decisão explícita.

Auth não deve ser exposta a tráfego público antes de rate limit adequado à topologia serverless e hardening operacional correspondente.

Contratos: [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) e [`docs/PRODUCTION_STATUS.md`](docs/PRODUCTION_STATUS.md).

## Roadmap

- **Fase 0 — Foundation:** qualidade, arquitetura, CI, design system e modelos de domínio. **Concluída; #7–#16 entregues.**
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
- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) — identidade, sessão, login/logout e ownership;
- [`docs/REPOSITORY_GOVERNANCE.md`](docs/REPOSITORY_GOVERNANCE.md) — CI, branch protection e merge policy.

**Nenhuma funcionalidade é considerada pronta apenas porque funciona localmente.** Ela precisa estar coerente com o domínio, testada no nível adequado, revisada, observável quando necessário e documentada.

## Documentação principal

- [Visão do produto](docs/VISION.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Índice de issues](docs/ISSUE_INDEX.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Autenticação e autorização](docs/AUTHENTICATION.md)
- [Modelo de domínio](docs/DOMAIN_MODEL.md)
- [Learning Engine](docs/LEARNING_ENGINE.md)
- [Modelo de conteúdo](docs/CONTENT_MODEL.md)
- [UX e Design](docs/UX_AND_DESIGN.md)
- [Tutor de IA](docs/AI_TUTOR.md)
- [Segurança e privacidade](docs/SECURITY_PRIVACY.md)
- [Estratégia de qualidade](docs/QUALITY_STRATEGY.md)
- [Configuração de runtime](docs/RUNTIME_CONFIGURATION.md)
- [PostgreSQL e Drizzle](docs/DATABASE.md)
- [Arquivos gerados](docs/GENERATED_FILES.md)
- [Governança do repositório](docs/REPOSITORY_GOVERNANCE.md)
- [Observabilidade](docs/OBSERVABILITY.md)
- [Deploy e produção](docs/PRODUCTION_DEPLOYMENT.md)
- [Status de produção](docs/PRODUCTION_STATUS.md)
- [Workflow de desenvolvimento](docs/DEVELOPMENT_WORKFLOW.md)
- [Definition of Done](docs/DEFINITION_OF_DONE.md)
