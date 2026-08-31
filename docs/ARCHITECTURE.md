# Arquitetura — LingoPilot

## 1. Direção arquitetural

O LingoPilot começa como **monólito modular em TypeScript**, com aplicação web e backend no mesmo repositório, banco PostgreSQL e contratos explícitos entre domínio, aplicação e infraestrutura.

A escolha é intencional: o produto ainda precisa validar seu Study Engine. Microserviços aumentariam coordenação, observabilidade e custo operacional sem benefício proporcional.

## 2. Stack de referência

A issue de bootstrap deve fixar versões estáveis e gerar lockfile. A direção arquitetural é:

- **Monorepo:** pnpm workspaces + Turborepo;
- **Web:** Next.js + React + TypeScript strict;
- **UI:** Tailwind CSS + componentes acessíveis encapsulados em `packages/ui`;
- **Validação:** Zod ou schema validator equivalente nas fronteiras;
- **Banco:** PostgreSQL;
- **ORM/query layer:** Drizzle ORM;
- **Testes unit/integration:** Vitest;
- **Componentes:** Testing Library;
- **E2E:** Playwright;
- **CI:** GitHub Actions;
- **Observabilidade:** logs estruturados + OpenTelemetry quando aplicável;
- **Storage:** interface S3-compatible para mídia;
- **IA:** provider abstraction em `packages/ai`.

Providers específicos de hosting, banco, storage e IA são decisões de infraestrutura e não podem vazar para o domínio.

## 3. Estrutura do monorepo

```text
apps/
  web/
    app/
    components/
    features/
    server/
packages/
  domain/
  learning/
  content/
  db/
  ai/
  ui/
  config/
  test-support/
docs/
  ADR/
```

### `packages/domain`

Entidades, value objects, regras invariantes, tipos e interfaces essenciais.

Não depende de:

- React;
- Next.js;
- Drizzle;
- SDK de IA;
- storage provider;
- analytics provider.

### `packages/learning`

Regras do motor de aprendizagem:

- session planner;
- progressão;
- mastery;
- review/SRS;
- elegibilidade;
- balanceamento de atividades.

Deve ser altamente testável com tempo controlado e dados em memória.

### `packages/content`

Schemas versionados e validação de:

- course;
- unit;
- lesson;
- activity;
- vocabulary;
- grammar concepts;
- dialogues/readings;
- content metadata.

### `packages/db`

- schema físico;
- migrations;
- repositories PostgreSQL;
- transaction helpers;
- test database utilities.

### `packages/ai`

- interfaces de provider;
- prompt registry;
- schema de respostas;
- context builder contracts;
- guardrails;
- eval fixtures.

### `packages/ui`

- tokens;
- primitives;
- componentes de feedback;
- componentes de estudo compartilhados;
- acessibilidade consistente.

## 4. Módulos de domínio

Limites iniciais:

```text
Identity
Learner
Curriculum
Content
Study Session
Exercise
Review
Progress
Skills
AI Coaching
```

Esses módulos não precisam ser deploys separados. São limites conceituais e de código.

## 5. Fluxo de uma sessão

```text
User opens Today
    ↓
Load learner profile + enrollment
    ↓
Load due reviews + unlocked curriculum + recent performance
    ↓
DailySessionPlanner.plan()
    ↓
Persist SessionPlan snapshot
    ↓
Render ordered activities
    ↓
User submits attempt
    ↓
Validate + persist Attempt atomically
    ↓
Update review state / mastery / lesson progress
    ↓
Emit internal progress event
    ↓
Next activity
```

O plano diário persistido deve ser um snapshot suficiente para explicar por que itens foram selecionados.

## 6. Use cases

Handlers web não devem conter regras substanciais. Exemplos de application use cases:

- `CreateLearnerProfile`
- `EnrollLearnerInCourse`
- `PlanDailySession`
- `StartLesson`
- `SubmitActivityAttempt`
- `CompleteLesson`
- `GradeReview`
- `RecordSpeakingAttempt`
- `UpdateMastery`
- `BuildTutorContext`

Cada use case recebe dependências por interface e retorna resultado tipado.

## 7. Persistência

### Princípios

- UUID/ULID ou identificador opaco consistente;
- timestamps em UTC;
- timezone do aluno armazenado separadamente;
- histórico pedagógico preservado;
- soft delete apenas quando houver motivo real;
- PII separada de dados pedagógicos quando útil;
- content revisions imutáveis após publicação sempre que possível.

### Transações

Submeter uma tentativa pode afetar:

- `attempt`;
- `activity_progress`;
- `review_state`;
- `concept_evidence`;
- `session_item`.

Essas atualizações devem ser transacionais quando inconsistência entre elas for inválida.

## 8. Idempotência

Ações suscetíveis a retry devem aceitar `operationId`/idempotency key ou possuir chave natural equivalente.

Casos prioritários:

- submit de exercício;
- conclusão de lesson;
- upload/finalização de speaking;
- callbacks externos;
- geração de sessão diária.

## 9. Conteúdo como dados

Conteúdo pedagógico não deve ser hardcoded em componentes React.

A UI renderiza blocos validados por schema. Isso permite:

- versionamento;
- revisão;
- importação;
- futura interface editorial;
- múltiplos idiomas;
- testes de integridade do curso.

## 10. IA

O provider de IA é acessado por adapter.

```text
Application
   ↓
AITutorService interface
   ↓
Provider adapter
```

Regras:

- timeout explícito;
- retry limitado;
- structured output;
- schema validation;
- prompt version;
- model metadata;
- fallback UX;
- nenhuma mutation crítica ocorre apenas porque a IA “disse” algo sem validação.

## 11. Jobs assíncronos

Não adicionar fila externa no bootstrap. Começar síncrono quando latência permitir.

Migrar para job assíncrono quando houver necessidade comprovada, especialmente:

- processamento de áudio;
- geração de assets;
- avaliações demoradas;
- analytics agregados.

A interface do use case deve permitir extração futura sem redesenhar o domínio.

## 12. Cache

Não usar cache para mascarar queries ruins.

Primeiras prioridades:

- cache estático/HTTP para assets de conteúdo publicados;
- memoização local para conteúdo imutável quando necessário;
- nenhum cache de progresso sem estratégia clara de invalidação.

## 13. Segurança

Toda leitura/escrita de recurso de usuário passa por autorização baseada em ownership.

Não confiar em IDs enviados pelo cliente como prova de acesso.

Fluxos com IA e mídia devem ser tratados como fronteiras externas.

## 14. Observabilidade

Cada request/use case crítico deve permitir correlacionar:

- request/session id;
- user id pseudonimizado quando necessário;
- use case;
- duração;
- resultado;
- erro categorizado;
- provider externo quando houver.

Nunca logar resposta livre, transcript ou áudio por padrão.

## 15. Performance

Prioridades:

1. reduzir round trips;
2. queries indexadas;
3. evitar N+1;
4. server rendering onde ajuda;
5. JS no cliente somente quando necessário;
6. lazy load de módulos pesados como recorder/tutor.

## 16. Evolução futura

Extrair um módulo para serviço separado somente se houver pelo menos uma necessidade concreta:

- escala independente comprovada;
- isolamento de segurança;
- runtime muito diferente;
- processamento assíncrono pesado;
- ownership de equipe que justifique fronteira operacional.

Até lá, modularidade de código é suficiente.

## 17. ADRs obrigatórios para mudanças estruturais

Criar ADR para:

- troca de banco;
- troca de ORM central;
- autenticação estrutural;
- adoção de fila/event bus;
- extração de serviço;
- mudança de estratégia de conteúdo;
- novo provider com lock-in significativo;
- armazenamento de áudio/PII com nova política;
- algoritmo de SRS/mastery que altere significado de progresso.
