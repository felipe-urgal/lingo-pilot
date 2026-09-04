# Roadmap — LingoPilot

Este roadmap descreve a sequência recomendada de construção. Ele não é um calendário: as fases representam dependências de produto e engenharia. Issues podem evoluir, mas uma fase não deve pular os fundamentos que protegem as seguintes.

> **Estado de execução em 2026-09-04:** a Fase 0 está concluída (#7–#16), #17–#24 já estão em `main` e o practice learning loop foi consolidado pelo PR #86. A frente ativa é #25 (Daily Session Planner v1), em review no PR #87. Após esse merge, a próxima dependência direta é #26 (session execution/resume/idempotency hardening), seguida por #27. O conteúdo A0→A2 real continua nas issues editoriais; o material atual é bootstrap estrutural.

## Fase 0 — Foundation

### Objetivo

Criar uma base pequena, profissional e previsível antes de implementar comportamento de produto.

### Estado atual

Concluído:

- monorepo e web shell (#7);
- CI permanente e governança da `main` (#8);
- contrato de ambiente/runtime local (#9);
- PostgreSQL, Drizzle, migrations e integration baseline (#10);
- autenticação first-party, sessão server-side e ownership authorization baseline (#11);
- boundaries de domínio/aplicação executáveis (#12);
- design system e app shell (#13);
- observabilidade/error taxonomy (#14);
- schemas e pipeline de conteúdo (#15);
- infraestrutura completa de testes, incluindo Playwright/fake clock/factories (#16).

As correções #54 e #56 consolidaram o contrato de ambiente/arquivos gerados. O baseline fail-closed de produção da #59 evoluiu em #63–#65 para uma capability operacional ativa com Vercel, Neon, migrations explícitas, health/readiness, backup/restore-check e integração com o Dev Dashboard. Isso melhora a operação do repositório, mas **não** encerra o hardening operacional da #45.

### Entregas

- monorepo TypeScript;
- aplicação web inicial;
- configuração strict, lint, format e testes;
- CI obrigatório;
- design system básico;
- PostgreSQL e migrations;
- autenticação e authorization baseline;
- estrutura de domínio e repositories;
- logging/observability baseline;
- conteúdo estruturado e validado;
- seeds sintéticos quando necessários;
- arquitetura de testes;
- documentação e ADRs.

### Exit criteria

- `main` reproduzível do zero;
- CI executa typecheck, lint e testes;
- ambiente local sobe com instruções claras;
- migrations e testes de integração passam;
- design tokens básicos existem;
- nenhuma regra de negócio crítica está acoplada a Next.js/ORM.

A Fase 0 encerrou com esses critérios validados. Evoluções operacionais e de segurança continuam nas issues donas, especialmente #45.

---

## Fase 1 — Study Engine

### Objetivo

Entregar o loop central do produto: entrar, receber plano de hoje, aprender, praticar, revisar e registrar progresso para uma jornada A0 → A2.

### Épico 1.1 — Perfil, jornada e onboarding

**Status: concluído pela #17.**

Entregue:

- criação de conta e sessão first-party para primeiro acesso;
- `LearnerProfile` para preferências globais;
- `LanguageProfile` para a jornada idioma fonte → idioma alvo;
- locale, timezone, meta diária e objetivo principal opcional;
- entrada V1: começar do zero ou escolher um ponto de entrada A1/A2 para falso iniciante;
- `Enrollment` ligando `LanguageProfile` ao curso;
- criação idempotente/transacional da jornada inicial;
- redirecionamento a Today após onboarding;
- edição posterior de preferências sem resetar o placement inicial.

A escolha manual de A1/A2 é um **ponto de entrada**, não uma prova de domínio. Conteúdo anterior pode ser dispensado para elegibilidade da trilha, mas não gera `Attempt`, `ReviewEvent`, `ConceptEvidence` ou `MasteryState` fictício. Um diagnóstico adaptativo completo continua posterior.

### Épico 1.2 — Currículo e conteúdo

**Status: foundation concluída pela #18; expansão editorial continua.**

A #18 entregou:

- registry `Course → Level → Unit → Lesson` a partir de JSON validado;
- catálogo pt-BR → en com IDs/revisions estáveis;
- elegibilidade pura/testável;
- diferença auditável entre `progress-satisfied`, `placement-waived` e prerequisite ausente;
- blocking de lesson locked por ID manual;
- proteção contra resume de revision incompatível.

O conteúdo atual é bootstrap estrutural: A0/A1/A2 existem no catálogo e há uma lesson de orientação do produto em A0. A migração/revisão pedagógica A0 piloto e a expansão A1/A2 continuam separadas.

### Épico 1.3 — Today + StudySession

**Status: foundation concluída pela #19; planner completo em evolução pela #25.**

Entregue pela #19:

- `StudySession + SessionItem` persistidos;
- `localStudyDate` derivada do timezone do aluno;
- shell versionado inicial;
- item ordenado com reason code, eligibility reason, revision e estimativa;
- unicidade por `Enrollment + localStudyDate` para geração concorrente idempotente;
- Today mobile-first com estados de loading, empty, error, success e completed.

A #25 evolui o shell para snapshot multi-item `daily-session-v1` sem invalidar sessões já persistidas.

### Épico 1.4 — Lesson Player

**Status: concluído pela #20.**

Entregue:

- renderer de ContentBlocks estruturados;
- objetivo da lesson e progresso de passos;
- start/resume por `LessonProgress`;
- posição persistida;
- navegação forward/back protegida contra submit stale/duplicado;
- completion explícita somente no último passo;
- ownership, eligibility e content revision revalidados no servidor;
- fallback seguro para bloco desconhecido/conteúdo indisponível/revision mismatch;
- layout mobile-first e controles nativos navegáveis por teclado.

### Épico 1.5 — Exercise Engine

**Status: concluído pela #21 no PR #86.**

Entregue:

- choice;
- fill blank;
- word ordering;
- matching;
- short answer/translation determinísticos;
- tentativa, feedback e retry;
- conceito/habilidade vinculados à tentativa.

### Épico 1.6 — Review/SRS

**Status: baseline concluída pelas #23–#24 no PR #86.**

Entregue:

- memory items;
- review state;
- scheduler versionado;
- fila de vencidos;
- histórico de review;
- proteção contra duplicidade;
- `ConceptEvidence` e `MasteryState` recomputáveis.

### Épico 1.7 — Daily Session Planner

**Status: em review no PR #87 pela #25.**

O V1 entrega:

- orçamento de minutos;
- prioridade para resume, review muito vencido e weak concept;
- elegibilidade de conteúdo novo;
- limite de carga de review;
- suspensão de conteúdo novo sob dívida extrema;
- modalidades executáveis como constraint;
- snapshot persistido e auditável;
- tie-breakers determinísticos;
- reason codes estáveis;
- instrumentação de decisão.

Política completa: `docs/DAILY_SESSION_PLANNER.md`.

Skill balance histórico fica deliberadamente sem heurística enquanto o produto não possui múltiplas modalidades completas e evidência representativa. Hardening completo da execução do snapshot continua na #26.

### Épico 1.8 — Progress & Mastery

**Status: ConceptEvidence + mastery v1 concluídos pela #24; UI completa permanece #27.**

- progress event model;
- domínio por conceito;
- habilidade por modalidade;
- página de progresso simples;
- conceitos frágeis;
- histórico de sessões.

### Gates intermediários

- vertical A0 funcional;
- 14 dias de dogfood A0 sem inconsistência de sessão/progresso;
- revisão do Learning Engine antes da expansão editorial ampla.

### Exit criteria

A fase só termina quando:

- A0, A1 e A2 possuem conteúdo representativo/publicado e progressão válida;
- o planner seleciona lessons/reviews de A0, A1 e A2 sem branches hardcoded por nível;
- existem testes de jornada para um aluno começando em A0 e para falsos iniciantes entrando em A1/A2;
- prerequisites/entry point não fabricam mastery para conteúdo dispensado;
- histórico, retomada e SRS permanecem consistentes ao atravessar limites de nível.

---

## Fase 2 — Skills + AI Evaluation Foundation

### Objetivo

Cobrir listening, speaking, reading e writing de ponta a ponta e introduzir **antes da avaliação por IA** a infraestrutura compartilhada de provider, contexto, schemas, guardrails e evals.

A fase não permite implementar feedback de writing/speaking diretamente contra SDK de provider para “integrar depois”. Captura e UX podem avançar antes; avaliação inteligente só é liberada depois dos contratos de IA.

### Épico 2.1 — Listening

- asset de áudio;
- player;
- transcript controlado;
- perguntas;
- registro de compreensão;
- velocidade/replay;
- conteúdo graduado.

### Épico 2.2 — Reading

- texto graduado;
- glossário contextual;
- compreensão;
- métricas de dificuldade.

### Épico 2.3 — Writing foundation

- resposta livre curta;
- modelo de `Attempt` seguro;
- self-check/model answer editorial quando aplicável;
- revisão e resubmissão;
- nenhum score inventado sem avaliação confiável.

### Épico 2.4 — Speaking foundation

- gravação web;
- upload seguro;
- transcrição por adapter;
- retry;
- retenção/exclusão;
- estado de processamento recuperável.

### Épico 2.5 — AI evaluation foundation

Antes de feedback inteligente de writing/speaking:

- `LanguageModelProvider` desacoplado;
- structured outputs + schema validation;
- prompt registry/versioning;
- `LearnerContext` e vocabulary/grammar ceiling;
- timeout/retry/fallback;
- dataset/harness de eval versionado;
- casos A0, A1 e A2;
- guardrails de privacidade, nível e custo;
- provider fake para CI.

### Épico 2.6 — Writing evaluation

- avaliação estruturada;
- feedback de erro;
- variantes válidas;
- reescrita;
- `ConceptEvidence` somente após output validado;
- fallback editorial sem perder tentativa.

### Épico 2.7 — Speaking evaluation

- avaliação de conteúdo linguístico a partir de sinais disponíveis;
- feedback por categoria;
- pronúncia somente quando o sinal/provider realmente suportar;
- evidência controlada;
- retry;
- fallback sem corromper progresso.

### Exit criteria

A fase só termina quando:

- listening, reading, writing e speaking possuem pelo menos um caminho completo integrado à sessão diária;
- writing e speaking que usam IA passam pela foundation compartilhada e pelo eval harness;
- evals de A0, A1 e A2 cobrem aderência de nível e casos pedagógicos críticos;
- a sessão diária consegue combinar modalidades receptivas e produtivas sem intervenção manual;
- falha de STT/LLM degrada a atividade afetada sem bloquear Today, SRS ou progresso determinístico;
- nenhum output inválido de IA altera mastery/progress.

---

## Fase 3 — AI Tutor & Adaptation

### Objetivo

Adicionar tutor conversacional e adaptação sobre a infraestrutura/evals já validada na Fase 2, sem entregar o controle curricular ao modelo.

### Entregas

- tutor chat contextual;
- conversation goals;
- vocabulary/grammar ceiling aplicado em conversa;
- structured correction em diálogo;
- error pattern detection;
- micropractice generation;
- adaptive reinforcement;
- regressões do tutor adicionadas ao eval dataset existente;
- provider fallback e timeouts reutilizando a foundation compartilhada.

### Exit criteria

- respostas estruturadas validadas;
- evals A0/A1/A2 cobrem cenários pedagógicos críticos do tutor;
- tutor não bloqueia sessão quando provider falha;
- taxa de violações de nível é monitorada;
- feedback pode ser auditado por prompt/version/model metadata;
- prática adaptativa não desbloqueia currículo nem fabrica domínio.

---

## Fase 4 — Product Hardening

### Objetivo

Transformar uma ferramenta funcional em um produto confiável para uso diário contínuo.

### Entregas

- PWA e estratégia offline;
- caching seguro;
- retries e idempotência;
- rate limiting;
- backup/restore testado;
- export/delete de dados;
- hardening LGPD;
- tracing e dashboards operacionais;
- performance budgets;
- analytics de aprendizagem;
- feature flags;
- accessibility audit;
- browser/device matrix;
- disaster recovery runbook.

A capability de Production já está ativa após #63–#65, com Vercel + Neon, migrations explícitas, health/readiness e backup/restore-check exercitados. A #45 continua responsável pelo **hardening operacional restante**, especialmente runbooks, incident response, recovery criteria e evolução das garantias conforme o produto passe a armazenar dados reais.

### Exit criteria

- recuperação de incidentes documentada;
- dados exportáveis e excluíveis;
- fluxos críticos suportam falhas previsíveis;
- performance e acessibilidade possuem checks objetivos.

---

## Fase 5 — Language Platform

### Objetivo

Generalizar a solução após validar o produto com inglês.

### Entregas

- course capability matrix por idioma;
- abstração de tokenizer/normalizer;
- locale-aware evaluation;
- conteúdo e áudio por variante;
- novos idiomas alvo;
- authoring workflow;
- publicação/rollback de conteúdo;
- diagnóstico adaptativo completo;
- B1+;
- preparação para monetização se houver decisão de produto.

### Exit criteria

Adicionar um segundo idioma não exige alterar regras centrais de sessão, progresso ou storage; apenas capacidades e conteúdo específicos entram por contratos definidos.

---

## Sequência técnica recomendada

```text
Docs/ADRs
  ↓
Tooling + CI                     ✅ #7/#8
  ↓
Runtime config + DB              ✅ #9/#10
  ↓
Auth                             ✅ #11
  ↓
Domain Skeleton                  ✅ #12
  ↓
Design/Observability/Content/Test foundations ✅ #13–#16
  ↓
Onboarding + LanguageProfile + Enrollment      ✅ #17
  ↓
Course catalog + curriculum eligibility        ✅ #18
  ↓
StudySession + Today                           ✅ #19
  ↓
Lesson Player                                  ✅ #20
  ↓
Exercise Engine + Attempts                     ✅ #21/#22 · PR #86
  ↓
Review/SRS + Concept Mastery                   ✅ #23/#24 · PR #86
  ↓
Daily Session Planner                          review: #25 · PR #87
  ↓
Session execution/resume hardening             próximo: #26
  ↓
Progress UI/history                            #27
  ↓
A0 dogfood → A1/A2 coverage
  ↓
Listening/Reading + Writing/Speaking foundations
  ↓
AI provider/context/eval foundation
  ↓
Writing/Speaking structured evaluation
  ↓
AI Tutor
  ↓
Adaptive Practice
  ↓
Hardening
```

## O que não fazer cedo

- microserviços;
- event streaming externo;
- CMS complexo;
- app nativo separado;
- gamificação pesada;
- arquitetura multi-tenant de escolas;
- billing;
- abstrações para dezenas de idiomas antes de um segundo curso real;
- personalização por IA antes de existir baseline determinístico;
- avaliação por IA antes de provider abstraction, schemas, guardrails e eval harness.

## Gestão do roadmap

Cada item executável deve existir como issue com:

- contexto;
- objetivo;
- escopo;
- fora de escopo;
- critérios de aceite;
- requisitos técnicos;
- testes;
- documentação;
- dependências;
- riscos.

Issues de épico servem como índice, não como substituto de tarefas implementáveis. O fechamento de uma issue deve ser refletido no épico/índice aplicável para evitar que documentação de status volte a apontar trabalho concluído como próximo passo.
