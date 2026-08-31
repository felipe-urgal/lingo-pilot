# Issue Index — LingoPilot

Este documento é o índice do backlog inicial criado a partir da visão, arquitetura e roadmap. As issues são a fonte operacional de execução; este arquivo serve como mapa estável para humanos e agentes.

## Epics

| Epic | Prioridade | Objetivo |
|---|---:|---|
| #2 Foundation — engineering baseline | P0 | Base técnica, CI, dados, auth, design, observabilidade e conteúdo |
| #3 Study Engine — core learning loop | P0 | Today, lesson, exercise, SRS, mastery, planner e progresso |
| #4 Skills — listening, speaking, reading and writing | P1 | Integrar quatro habilidades ao mesmo modelo de evidência |
| #5 AI Tutor — constrained adaptive coaching | P1 | IA contextual, validada, observável e pedagogicamente limitada |
| #6 Product hardening & language platform | P2 | Resiliência, privacidade, operação e expansão multi-idioma |

## Fase 0 — Foundation

- #7 Bootstrap monorepo and web application shell
- #8 CI quality gates and repository governance
- #9 Local development environment and configuration contract
- #10 PostgreSQL, Drizzle schema and migration workflow
- #11 Authentication and ownership authorization baseline
- #12 Establish domain/application boundaries and repository contracts
- #13 Design system tokens, primitives and application shell
- #14 Structured logging, error taxonomy and observability baseline
- #15 Versioned content schemas and validation pipeline
- #16 Test infrastructure, factories and deterministic clock

### Sequência inicial recomendada

```text
PR #1 merge
   ↓
#7 bootstrap
   ├── #8 CI
   ├── #9 config → #10 DB → #11 auth
   ├── #12 boundaries
   ├── #13 design system
   ├── #14 observability
   ├── #15 content schemas
   └── #16 test infrastructure
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

A prioridade é produzir uma vertical A0 real o mais cedo possível, sem cortar os fundamentos de integridade:

```text
profile/enrollment
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
A1/A2 expansion
```

## Fase 2 — Skills

- #30 Listening player, graded dialogues and comprehension activities
- #31 Graded reading experience and comprehension evidence
- #32 Writing prompts, submission model and revision UX
- #33 Speaking recorder, secure upload and retention lifecycle
- #34 Speech transcription pipeline and speaking attempt processing

## Fase 3 — AI Tutor

- #35 Provider abstraction, structured outputs and prompt registry
- #36 LearnerContext builder and pedagogical constraints
- #41 Versioned AI evaluation harness and quality gates
- #37 Context-aware tutor conversation experience
- #38 Structured writing evaluation and corrective feedback
- #39 Structured speaking feedback from transcript and available speech signals
- #40 Adaptive micropractice generation from recurring errors

### Regra de sequência da IA

A infraestrutura e os evals vêm antes de liberar comportamentos inteligentes:

```text
provider contracts → learner context → eval harness
                              ↓
                  tutor / writing / speaking
                              ↓
                    adaptive micropractice
```

## Fases 4 e 5 — Hardening & Platform

- #42 PWA, offline resilience and safe retry strategy
- #43 User data export, deletion and retention enforcement
- #44 Accessibility audit and performance budgets
- #45 Backup, restore, deployment and incident runbooks
- #46 Product and learning analytics with privacy-safe event schemas
- #47 Multi-language capability contracts and locale-aware normalization
- #48 Content publication, revision rollout and rollback workflow
- #50 Validate platform with B1 expansion and a second-language pilot

## Prioridades

### P0

O produto não deve avançar seriamente sem estes itens. Inclui Foundation e o core do Study Engine.

### P1

Entrega valor alto após o core estar confiável: skills, dogfood/expansão e AI Tutor.

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

## Próximo passo

Após merge do PR #1, a primeira implementação recomendada é **#7 — Bootstrap monorepo and web application shell**.
