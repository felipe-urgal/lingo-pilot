# Roadmap — LingoPilot

Este roadmap descreve a sequência recomendada de construção. Ele não é um calendário: as fases representam dependências de produto e engenharia. Issues podem evoluir, mas uma fase não deve pular os fundamentos que protegem as seguintes.

## Fase 0 — Foundation

### Objetivo

Criar uma base pequena, profissional e previsível antes de implementar comportamento de produto.

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
- seeds sintéticos;
- arquitetura de testes;
- documentação e ADRs.

### Exit criteria

- `main` reproduzível do zero;
- CI executa typecheck, lint e testes;
- ambiente local sobe com instruções claras;
- uma migration de exemplo e um teste de integração passam;
- design tokens básicos existem;
- nenhuma regra de negócio crítica está acoplada a Next.js/ORM.

---

## Fase 1 — Study Engine

### Objetivo

Entregar o loop central do produto: entrar, receber plano de hoje, aprender, praticar, revisar e registrar progresso para uma jornada A0 → A2.

### Épico 1.1 — Perfil, jornada e onboarding

- conta e sessão;
- `LearnerProfile` para preferências globais;
- `LanguageProfile` para a jornada idioma fonte → idioma alvo;
- meta diária;
- entrada V1: começar do zero ou escolher um ponto de entrada A1/A2 para falso iniciante;
- `Enrollment` ligando `LanguageProfile` ao curso;
- criação idempotente/transacional da jornada inicial.

A escolha manual de A1/A2 é um **ponto de entrada**, não uma prova de domínio. Conteúdo anterior pode ser dispensado para elegibilidade da trilha, mas não gera `Attempt`, `ReviewEvent` ou `MasteryState` fictício. Um diagnóstico adaptativo completo continua posterior.

### Épico 1.2 — Currículo e conteúdo

- Course / Level / Unit / Lesson / Activity;
- content revision;
- schema de lesson;
- import/validation pipeline;
- A0 piloto;
- A1/A2 completos progressivamente;
- regras explícitas de elegibilidade por enrollment/entry point.

### Épico 1.3 — Lesson Player

- blocos pedagógicos;
- navegação;
- persistência de progresso;
- retomada;
- completion rules;
- estados de erro e offline parcial.

### Épico 1.4 — Exercise Engine

- choice;
- fill blank;
- word ordering;
- matching;
- short answer;
- tentativa, feedback e retry;
- conceito/habilidade vinculados à tentativa.

### Épico 1.5 — Review/SRS

- memory items;
- review state;
- scheduler baseado em FSRS ou implementação equivalente validada;
- fila de vencidos;
- histórico de review;
- proteção contra duplicidade.

### Épico 1.6 — Daily Session Planner

- orçamento de minutos;
- prioridade de revisões vencidas;
- elegibilidade de conteúdo novo;
- equilíbrio entre modalidades;
- limite de carga;
- retomada da sessão;
- sessão determinística e auditável.

### Épico 1.7 — Progress & Mastery

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
Tooling + CI
  ↓
DB/Auth + Domain Skeleton
  ↓
Content Schema + Seed Course
  ↓
Onboarding + LanguageProfile + Enrollment
  ↓
Lesson + Exercise Engine
  ↓
Review/SRS
  ↓
Daily Session Planner
  ↓
Progress/Mastery
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

Issues de épico servem como índice, não como substituto de tarefas implementáveis.
