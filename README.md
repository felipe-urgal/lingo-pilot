# LingoPilot

> Seu caminho diário para aprender um idioma.

LingoPilot é uma plataforma pessoal de aprendizado de idiomas orientada por progresso. A proposta central é simples: o aluno não precisa decidir o que estudar a cada dia. O sistema organiza a sessão diária, ensina conteúdo novo, revisa o que está prestes a ser esquecido, mede desempenho e adapta os próximos passos.

O primeiro recorte do produto é **Português (Brasil) → Inglês**, começando em **A0 absoluto** e avançando por **A1 e A2**. A arquitetura nasce preparada para novos idiomas e níveis sem transformar o domínio em um conjunto de exceções.

## Estado atual

O repositório concluiu a **Fase 0 — Foundation**. As issues #7–#16 entregaram bootstrap do monorepo/web shell, CI/governança da `main`, contrato de runtime local, foundation PostgreSQL/Drizzle, autenticação/autorização por ownership, boundaries executáveis, design system, observabilidade, schemas versionados de conteúdo com pipeline de validação e infraestrutura determinística de testes.

A **Fase 1 — Study Engine** já cobre #17–#24 em `main`: signup/onboarding, catálogo/elegibilidade, `StudySession` diária, Today, Lesson Player retomável, Exercise Engine determinístico, Attempts transacionais/idempotentes, fila de revisão espaçada e evidência/mastery por conceito. O PR #86 consolidou o practice learning loop das #21–#24.

A #25 está em review no PR #87 e evolui o shell diário para `daily-session-v1`: resume, reviews vencidos, weak concepts e conteúdo novo passam a competir por um budget diário determinístico e auditável, persistido como snapshot multi-item. O hardening completo da execução desse plano continua na #26 e a UI completa de progresso/histórico continua na #27.

O conteúdo autorado continua deliberadamente pequeno: Course/Level/Unit A0/A1/A2, uma lesson de orientação A0 e uma Activity/Concept determinísticos para exercitar o loop de prática. A migração editorial das aulas reais A0→A2 continua separada.

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

## Desenvolvimento local

A receita canônica para instalar, preparar banco/ambiente, subir a aplicação, testar e validar antes do PR está em [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

Quickstart:

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

Antes do PR:

```bash
pnpm check
```

`pnpm check` é o gate canônico e cobre lint, typecheck, unit/integration, content validation e build. Formatação, configuração/runtime, consistência/smoke de banco e E2E são checks direcionados conforme o escopo.

O contrato especializado de portas/profiles fica em [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md).

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
pnpm test:e2e          executa Playwright isolado em 127.0.0.1:5401
pnpm test              executa unit + integration
pnpm content:validate  valida schemas e integridade do grafo de conteúdo JSON
pnpm check:workspace   valida boundaries estruturais
pnpm format            normaliza formatação com Prettier
pnpm format:check      verifica formatação sem alterar arquivos
pnpm check             gate obrigatório agregado do repositório
pnpm prod:status       mostra o contrato/status operacional de produção
pnpm prod:prepare      prepara a infraestrutura local do preflight
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

Status obrigatório atual:

```text
CI / quality
```

O job usa instalação frozen, PostgreSQL 17 efêmero e executa o mesmo gate local:

```bash
pnpm check
```

O ruleset ativo da `main` exige o contexto `quality`. A simplificação do CI de 2026-09-04 removeu deliberadamente format/env/db checks e E2E do custo fixo de todo PR; esses comandos continuam disponíveis conforme risco/escopo.

Para fluxo browser-first relevante:

```bash
pnpm test:e2e
```

Governança completa: [`docs/REPOSITORY_GOVERNANCE.md`](docs/REPOSITORY_GOVERNANCE.md).

## Estrutura do monorepo

```text
apps/
  web/                  Next.js + delivery/auth/onboarding/Today/Lesson Player
content/                currículo JSON versionado e validado
packages/
  domain/               contratos puros da jornada, sessão e progresso
  learning/             elegibilidade, planner diário, mastery e SRS
  content/              schemas, parser, validação e catálogo curricular
  db/                   persistência/migrations de auth, jornada e StudySession
  ai/                   providers, prompts, guardrails e eval contracts
  ui/                   primitives compartilhados
  config/               tooling + contrato tipado de configuração
  test-support/         suporte determinístico de testes
scripts/                checks e operações locais do repositório
tests/                  testes estruturais e fluxos E2E da Fase 1
docs/                   produto, arquitetura e operação
```

Os packages são **boundaries explícitos**. `@lingo-pilot/domain` não depende de Next.js, React, Drizzle ou providers externos. A migration `0000` cria metadata técnica; `0001` identidade/credencial/sessão/ownership; `0002` `LearnerProfile + LanguageProfile + Enrollment`; `0003` adiciona `LessonProgress`, `StudySession` e `SessionItem`; `0004` adiciona o practice learning loop; e `0005` amplia `SessionItem` para o snapshot diário com reviews sem reinterpretar dados existentes.

## Primeiro acesso e fluxo de estudo

O fluxo da Fase 1 é:

```text
/signup
  ↓
conta + sessão
  ↓
/app/onboarding
  ↓
LearnerProfile + LanguageProfile + Enrollment
  ↓
Curriculum Eligibility
  ↓
/app/today → StudySession diária
  ↓
Lesson / Review → Attempt / ReviewEvent → Evidence / Mastery
```

A entrada pode ser A0 (`placementSource=zero`) ou A1/A2 (`placementSource=manual`). A escolha manual serve apenas para posicionar a trilha: ela não cria `Attempt`, `ReviewEvent`, `ConceptEvidence`, `MasteryState` nem completion fictício.

Today calcula a data local pelo timezone do aluno e persiste no máximo uma sessão por `Enrollment + localStudyDate`. O planner V1 (`daily-session-v1`, em review no PR #87) combina resume, reviews muito vencidos, weak concepts e próxima lesson elegível dentro da meta diária. O snapshot preserva reason code, motivo de elegibilidade quando aplicável e revision do conteúdo, portanto refresh não replana silenciosamente uma sessão existente. Política completa: [`docs/DAILY_SESSION_PLANNER.md`](docs/DAILY_SESSION_PLANNER.md).

O Lesson Player renderiza `ContentBlock` estruturado, persiste posição e exige ação explícita no último passo para concluir. Start/resume revalidam ownership, eligibility e `schemaVersion + revision`; uma URL manual ou uma revision alterada não consegue forçar progresso.

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

Autenticação segue a mesma direção: delivery resolve identidade via `AuthAdapter`; domínio não conhece cookie, senha, token ou provider. Ownership da jornada e dos recursos de estudo é aplicado no servidor, usando o `Enrollment` alcançado pela identidade autenticada em vez de confiar em IDs enviados pelo browser.

A direção completa está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md), [`docs/ADR/0001-initial-architecture.md`](docs/ADR/0001-initial-architecture.md) e [`docs/ADR/0003-first-party-auth-session.md`](docs/ADR/0003-first-party-auth-session.md).

## Produção

A receita canônica de preflight, migration, promoção e verify está em [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

A topologia ativa é:

```text
GitHub main
   ↓
Vercel Production
   ↓
Next.js / LingoPilot
   ↓
Neon PostgreSQL
```

Fluxo resumido:

```text
pnpm prod:prepare
-> pnpm prod:check
-> pnpm prod:backup / prod:migrate quando aplicável
-> merge em main
-> Vercel Production
-> pnpm prod:verify
```

Não existe `prod:deploy` local. Migrations permanecem explícitas e fora do build da Vercel. Production usa a branch Neon `main`; Preview, quando explicitamente usado, permanece isolado.

Detalhes técnicos e evidências ficam em [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) e [`docs/PRODUCTION_STATUS.md`](docs/PRODUCTION_STATUS.md).

## Roadmap

- **Fase 0 — Foundation:** qualidade, arquitetura, CI, design system e modelos de domínio. **Concluída; #7–#16 entregues.**
- **Fase 1 — Study Engine:** onboarding, conteúdo A0–A2, Today, aulas, exercícios, SRS e progresso. **#17–#24 entregues; #25 em review no PR #87. Depois, #26 é a próxima dependência direta e #27 fecha a visualização de progresso/histórico.**
- **Fase 2 — Skills + AI assessment foundation:** listening, reading, writing, speaking e infraestrutura/evals necessários às avaliações inteligentes.
- **Fase 3 — AI Tutor & Adaptation:** tutor contextual e prática adaptativa sobre a foundation validada.
- **Fase 4 — Product Hardening:** segurança, observabilidade, dados, performance e PWA/offline.
- **Fase 5 — Language Platform:** novos níveis/idiomas e generalização após validação do produto.

Veja [`docs/ROADMAP.md`](docs/ROADMAP.md) e [`docs/ISSUE_INDEX.md`](docs/ISSUE_INDEX.md).

## Desenvolvimento

Antes de alterar código, comece por:

- [`AGENTS.md`](AGENTS.md) — contrato operacional para agentes;
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — setup, execução local e gate antes do PR;
- [`docs/PRODUCTION.md`](docs/PRODUCTION.md) — quando a mudança afetar deploy, migration, readiness ou operação.

Docs especializadas continuam disponíveis para arquitetura, domínio, banco, runtime, qualidade e governança.

**Nenhuma funcionalidade é considerada pronta apenas porque funciona localmente.** Ela precisa estar coerente com o domínio, testada no nível adequado, revisada, observável quando necessário e documentada.

## Documentação principal

- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Produção](docs/PRODUCTION.md)
- [Visão do produto](docs/VISION.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Índice de issues](docs/ISSUE_INDEX.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Autenticação e autorização](docs/AUTHENTICATION.md)
- [Modelo de domínio](docs/DOMAIN_MODEL.md)
- [Learning Engine](docs/LEARNING_ENGINE.md)
- [Daily Session Planner](docs/DAILY_SESSION_PLANNER.md)
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
- [Contrato técnico de produção](docs/PRODUCTION_DEPLOYMENT.md)
- [Status de produção](docs/PRODUCTION_STATUS.md)
- [Workflow de desenvolvimento](docs/DEVELOPMENT_WORKFLOW.md)
- [Definition of Done](docs/DEFINITION_OF_DONE.md)

### Loop de prática executável

No último passo de uma lesson, Activities determinísticas são avaliadas no servidor e registradas como `ActivityAttempt`. A mesma transação atualiza `ActivityProgress`, cria `ConceptEvidence`, inicializa `MemoryItem` e recalcula `MasteryState`. `operationKey` torna retries idempotentes; a política `maxAttempts` é aplicada de forma serializada por learner + Activity.

```text
Lesson Player
   ↓
Activity → Attempt
   ↓         ↓
feedback   ConceptEvidence → MasteryState
   ↓
MemoryItem → /app/review → ReviewEvent
```

A due queue é ordenada deterministicamente, limitada/paginável e o histórico de `ReviewEvent` não é apagado por remoção de `MemoryItem`. O scheduler V1 é versionado (`review-scheduler-v1`) e deliberadamente não é apresentado como FSRS; a decisão está em `docs/ADR/0005-practice-scheduler-and-mastery-v1.md`.
