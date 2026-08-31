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

Entregar o loop central do produto: entrar, receber plano de hoje, aprender, praticar, revisar e registrar progresso.

### Épico 1.1 — Perfil e onboarding

- conta e sessão;
- learner profile;
- idioma fonte/alvo;
- meta diária;
- escolha de começar do zero;
- enrollment em curso.

### Épico 1.2 — Currículo e conteúdo

- Course / Level / Unit / Lesson / Activity;
- content revision;
- schema de lesson;
- import/validation pipeline;
- A0 piloto;
- A1/A2 progressivamente.

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

### Exit criteria

Um usuário A0 consegue usar o produto por 14 dias, recebendo sessão diária sem selecionar manualmente conteúdo e sem inconsistência no histórico.

---

## Fase 2 — Skills

### Objetivo

Cobrir as quatro habilidades de modo integrado ao Study Engine.

### Listening

- asset de áudio;
- player;
- transcript controlado;
- perguntas;
- registro de compreensão;
- velocidade/replay;
- conteúdo graduado.

### Speaking

- gravação web;
- upload seguro;
- transcrição;
- avaliação de resposta;
- feedback por categoria;
- retry;
- retenção/exclusão.

### Reading

- texto graduado;
- glossário contextual;
- compreensão;
- métricas de dificuldade.

### Writing

- resposta livre curta;
- avaliação estruturada;
- feedback de erro;
- reescrita;
- geração de reforço.

### Exit criteria

A sessão diária consegue combinar conteúdo novo, revisão e pelo menos duas modalidades produtivas/receptivas sem intervenção manual.

---

## Fase 3 — AI Tutor & Adaptation

### Objetivo

Adicionar inteligência adaptativa sem entregar o controle curricular ao modelo.

### Entregas

- AI provider abstraction;
- prompt registry/versioning;
- learner context builder;
- tutor chat;
- vocabulary/grammar ceiling;
- structured correction;
- micropractice generation;
- error pattern detection;
- adaptive reinforcement;
- AI eval dataset;
- hallucination/level guardrails;
- provider fallback e timeouts.

### Exit criteria

- respostas estruturadas validadas;
- evals cobrem cenários pedagógicos críticos;
- tutor não bloqueia sessão quando provider falha;
- taxa de violações de nível monitorada;
- feedback pode ser auditado por prompt/version/model metadata.

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
- diagnóstico inicial;
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
Onboarding
  ↓
Lesson + Exercise Engine
  ↓
Review/SRS
  ↓
Daily Session Planner
  ↓
Progress/Mastery
  ↓
Listening/Reading
  ↓
Speaking/Writing
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
- personalização por IA antes de existir baseline determinístico.

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
