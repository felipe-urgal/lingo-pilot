# Issue Index — LingoPilot

Este documento é o índice do backlog criado a partir da visão, arquitetura e roadmap. As issues são a fonte operacional de execução; este arquivo serve como mapa estável para humanos e agentes.

> **Estado de referência:** 2026-09-02. O status abaixo reflete as issues do GitHub nessa data. Em caso de divergência futura, a issue é a fonte de verdade e este índice deve ser atualizado no mesmo trabalho de manutenção.

## Epics

| Epic | Prioridade | Objetivo |
|---|---:|---|
| #2 Foundation — engineering baseline | P0 | Base técnica, CI, dados, auth, design, observabilidade e conteúdo |
| #3 Study Engine — core learning loop | P0 | Today, lesson, exercise, SRS, mastery, planner e progresso |
| #4 Skills — listening, speaking, reading and writing | P1 | Integrar quatro habilidades ao mesmo modelo de evidência |
| #5 AI Tutor — constrained adaptive coaching | P1 | Infra de IA, avaliação estruturada, tutor e adaptação com guardrails |
| #6 Product hardening & language platform | P2 | Resiliência, privacidade, operação e expansão multi-idioma |

## Fase 0 — Foundation

| Issue | Status | Observação |
|---|---|---|
| #7 Bootstrap monorepo and web application shell | Concluída | Monorepo, web shell, scripts-base e contrato inicial de portas |
| #8 CI quality gates and repository governance | Concluída | CI permanente e proteção da `main` |
| #9 Local development environment and configuration contract | Concluída | Runtime config, `.env.local` raiz e profiles determinísticos |
| #10 PostgreSQL, Drizzle schema and migration workflow | Concluída | PostgreSQL/Drizzle, migrations e integration baseline |
| #11 Authentication and ownership authorization baseline | Concluída | Auth first-party PostgreSQL, sessão server-side, shell privado e ownership baseline |
| #12 Establish domain/application boundaries and repository contracts | Concluída | Boundaries executáveis, ports e Result/erros tipados |
| #13 Design system tokens, primitives and application shell | Concluída | Tokens, primitives acessíveis, app shell responsivo e demo interna |
| #14 Structured logging, error taxonomy and observability baseline | Concluída | Logger estruturado, correlation ID, taxonomy, redaction e hooks de telemetria |
| #15 Versioned content schemas and validation pipeline | Aberta | Desbloqueada por #7 e #8 |
| #16 Test infrastructure, factories and deterministic clock | Concluída | Vitest, Testing Library, Playwright, test-support e harness PostgreSQL isolado |

### Manutenção concluída durante a Foundation

- #54 corrigiu a propagação do `.env.local` raiz para build/runtime;
- #56 alinhou `next-env.d.ts` à política atual do Next.js e protegeu a árvore Git contra churn gerado;
- #59 estabeleceu o baseline fail-closed inicial do Production Contract;
- #63 implementou comandos operacionais, backup/restore-check e health/readiness;
- #64 ativou o Production Contract real com Vercel + Neon após validação operacional;
- #65 alinhou o manifesto ativo ao vocabulário canônico do Dev Dashboard;
- #66/#69 atualizaram Next.js para `16.3.4`, acima do security floor corrigido da linha 16.3.

A capability de Production está ativa, mas isso não encerra o hardening operacional da #45 nem a Foundation de produto/engenharia.

### Sequência atual recomendada

Bootstrap, runtime, persistência, auth, boundaries, design system, observabilidade e infraestrutura de testes já foram entregues. A próxima frente elegível da Foundation é:

```text
#15 content schemas
```

## Fase 1 — Study Engine

- #17 Learner profile and onboarding flow
- #18 Course catalog, enrollment and curriculum eligibility
- #19 StudySession data model and Today experience shell
- #20 Lesson Player with structured pedagogical blocks
- #21 Exercise Engine for deterministic activity types
- #22 Transactional attempt submission and feedback pipeline
- #23 Spaced repetition engine and review queue
- #24 Concept evidence and mastery model v1
- #25 Daily Session Planner v1
- #26 Session execution, resume and idempotency hardening
- #27 Progress, weak concepts and study history
- #28 Migrate and editorially review A0 course content
- #49 14-day A0 dogfood validation and learning-loop review
- #29 Migrate and editorially review A1 and A2 course content

### Estratégia de entrega

A prioridade é produzir uma vertical A0 real o mais cedo possível, sem cortar os fundamentos de integridade. O dogfood A0 é **gate intermediário**, não autorização para considerar a Fase 1 concluída sem A1/A2.

```text
profile + LanguageProfile + Enrollment
      ↓
lesson → exercise → attempt
      ↓             ↓
     content       SRS → mastery
      ↓                    ↓
Today/session ─────────→ planner
      ↓                    ↓
resume ───────────────→ progress
      ↓
A0 dogfood
      ↓
A1/A2 content + progression + representative E2E
```

A Fase 1 só encerra quando o Study Engine cobre A0, A1 e A2 sem lógica especial por nível e quando entry point manual A1/A2 não fabrica mastery.

## Fase 2 — Skills + AI Evaluation Foundation

A infraestrutura compartilhada de IA entra **antes** das avaliações por IA de writing/speaking. Captura/UX pode avançar sem ela, mas feedback inteligente não.

### Skill foundations

- #30 Listening player, graded dialogues and comprehension activities
- #31 Graded reading experience and comprehension evidence
- #32 Writing prompts, submission model and revision UX
- #33 Speaking recorder, secure upload and retention lifecycle
- #34 Speech transcription pipeline and speaking attempt processing

### AI evaluation foundation — prerequisite compartilhado

- #35 Provider abstraction, structured outputs and prompt registry
- #36 LearnerContext builder and pedagogical constraints
- #41 Versioned AI evaluation harness and quality gates

### Structured skill evaluation

- #38 Structured writing evaluation and corrective feedback
- #39 Structured speaking feedback from transcript and available speech signals

### Ordem obrigatória

```text
listening / reading
writing capture / speaking capture
          ↓
STT adapter quando aplicável
          ↓
provider contracts → learner context → eval harness
          ↓
writing evaluation / speaking evaluation
          ↓
Fase 2 exit: quatro skills ponta a ponta
```

`#38` e `#39` não podem ser implementadas antes de `#35`, `#36` e `#41` estarem prontas para a feature correspondente.

## Fase 3 — AI Tutor & Adaptation

- #37 Context-aware tutor conversation experience
- #40 Adaptive micropractice generation from recurring errors

### Regra de sequência da IA

Tutor e prática adaptativa reutilizam a foundation já validada na Fase 2:

```text
#35 provider contracts
   ↓
#36 learner context
   ↓
#41 eval harness
   ↓
#38/#39 skill evaluations
   ↓
#37 tutor
   ↓
#40 adaptive micropractice
```

O tutor V1 precisa de evals representativos de **A0, A1 e A2**; cobertura A0/A1 não é suficiente para liberar A2.

## Fases 4 e 5 — Hardening & Platform

- #42 PWA, offline resilience and safe retry strategy
- #43 User data export, deletion and retention enforcement
- #44 Accessibility audit and performance budgets
- #45 Backup, restore, deployment and incident runbooks
- #46 Product and learning analytics with privacy-safe event schemas
- #47 Multi-language capability contracts and locale-aware normalization
- #48 Content publication, revision rollout and rollback workflow
- #50 Validate platform with B1 expansion and a second-language pilot

A produção operacional já foi ativada por #63–#65: Vercel, Neon, migrations explícitas, health/readiness, backup/restore-check e integração com o Dev Dashboard foram exercitados. A #45 continua aberta para o **hardening restante**, especialmente runbooks, incident response, critérios adicionais de recovery e evolução operacional conforme o produto passar a armazenar dados reais.

## Prioridades

### P0

O produto não deve avançar seriamente sem estes itens. Inclui Foundation e o core do Study Engine.

### P1

Entrega valor alto após o core estar confiável: skills, dogfood/expansão, evaluation foundation e AI Tutor.

### P2

Hardening, operacionalização e generalização da plataforma. Alguns itens de segurança/backup podem subir de prioridade quando o produto passar a armazenar dados reais de terceiros.

## Regras para execução do backlog

1. Ler `AGENTS.md` antes de atuar.
2. Confirmar dependências da issue.
3. Não iniciar uma issue bloqueada apenas para “adiantar UI” usando mocks incompatíveis com contratos previstos.
4. Quando mocks forem úteis, eles devem implementar o mesmo contrato real.
5. Uma issue pode ser quebrada em subissues se o PR se tornar grande demais.
6. Nova descoberta relevante vira issue ou comentário explícito; não esconder escopo extra no PR.
7. Bugs críticos de integridade, autorização ou perda de dados interrompem a sequência normal.
8. Documentação e testes fazem parte da issue.
9. Epics são tracking; tarefas implementáveis são as issues filhas.
10. O roadmap é vivo, mas mudanças de prioridade devem preservar dependências técnicas e pedagógicas.
11. Ponto de entrada/placement nunca é convertido em mastery, attempt ou review fictício.
12. Nenhum fluxo de IA de usuário é liberado sem schema/guardrails/evals proporcionais ao risco e aos níveis suportados.
13. Uma issue fechada deve ser refletida nos épicos/índices aplicáveis; não manter checklist operacional propositalmente desatualizado.

## Próximo passo

A Foundation concluiu #7–#14 e #16. A próxima issue elegível é **#15**. Produção já está ativa como capability operacional, mas a #45 continua responsável pelo hardening e pelos runbooks restantes.
