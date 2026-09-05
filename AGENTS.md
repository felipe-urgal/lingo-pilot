# AGENTS.md — Contrato de desenvolvimento para agentes de IA

Este documento define como agentes de IA devem atuar no LingoPilot. Ele é normativo para decisões de implementação, mas não substitui a documentação especializada do repositório.

O objetivo do agente não é produzir o maior volume de código. É deixar o LingoPilot **mais correto, mais claro ou mais fácil de evoluir**, preservando a experiência do aluno e os contratos já estabelecidos.

## 1. Ordem de prioridade

Ao tomar decisões, use esta ordem:

1. correção e segurança;
2. clareza do produto e experiência do aluno;
3. integridade do domínio e dos dados;
4. simplicidade de manutenção;
5. testabilidade e observabilidade;
6. performance comprovadamente necessária;
7. velocidade de implementação;
8. preferência estética ou abstração opcional.

Quando duas soluções atendem ao requisito, prefira a menor solução coesa que respeita os contratos existentes.

## 2. Como começar uma tarefa

Antes de editar arquivos:

1. leia a issue completa e seus comentários;
2. identifique critérios de aceite, riscos e casos de borda;
3. localize o boundary responsável pela mudança;
4. leia somente os documentos especializados relevantes ao escopo;
5. inspecione implementações e testes existentes antes de criar abstrações;
6. identifique quais testes e checks o risco da mudança exige;
7. defina um plano curto de implementação;
8. evite mudanças fora do escopo, salvo correções pequenas necessárias para manter coerência.

Não invente requisito de produto silenciosamente. Se a ambiguidade permitir duas implementações materialmente diferentes ou alterar comportamento esperado, registre a dúvida e peça decisão.

## 3. Sources of truth

O `AGENTS.md` define invariantes e orienta navegação. Detalhes operacionais pertencem aos documentos canônicos abaixo:

| Assunto                                  | Fonte de verdade                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| versões, scripts e comandos disponíveis  | `package.json` e manifests dos workspaces                                           |
| setup local, execução e gate antes do PR | `docs/DEVELOPMENT.md`                                                               |
| arquitetura e direção estrutural         | `docs/ARCHITECTURE.md`                                                              |
| boundaries e direção de dependências     | `docs/APPLICATION_BOUNDARIES.md`                                                    |
| qualidade e estratégia de testes         | `docs/QUALITY_STRATEGY.md`                                                          |
| banco, Drizzle e migrations              | `docs/DATABASE.md`                                                                  |
| autenticação                             | `docs/AUTHENTICATION.md`                                                            |
| segurança e privacidade                  | `docs/SECURITY_PRIVACY.md`                                                          |
| design system                            | `docs/DESIGN_SYSTEM.md`                                                             |
| princípios de UX                         | `docs/UX_AND_DESIGN.md`                                                             |
| conteúdo pedagógico                      | `docs/CONTENT_MODEL.md` e documentos relacionados ao conteúdo                       |
| IA                                       | `docs/AI_PROVIDER_FOUNDATION.md`, `docs/AI_TUTOR.md` e documentos do fluxo alterado |
| produção e recovery                      | `docs/PRODUCTION.md`                                                                |
| conclusão da tarefa                      | `docs/DEFINITION_OF_DONE.md`                                                        |
| workflow e governança                    | `docs/DEVELOPMENT_WORKFLOW.md` e `docs/REPOSITORY_GOVERNANCE.md`                    |
| decisões estruturais                     | `docs/ADR/`                                                                         |

Não duplique nesses arquivos regras que já possuem fonte canônica. Quando um contrato mudar, atualize sua fonte de verdade e apenas ajuste referências aqui se necessário.

## 4. Mapa do repositório

A estrutura atual deve orientar onde cada responsabilidade vive:

```text
apps/
  web/
    app/                    Next.js delivery, pages, layouts e route handlers
    server/application/     use cases e orchestration sem dependência de framework/banco

packages/
  domain/                   tipos, invariantes, contratos e ports essenciais
  learning/                 Study Engine: planner, progressão, mastery, review/SRS
  content/                  schemas e validação de conteúdo
  db/                       Drizzle, PostgreSQL, repositories, migrations e test DB
  ai/                       providers, prompts, schemas, guardrails e eval fixtures
  ui/                       tokens, primitives e componentes compartilhados
  config/                   configuração e runtime contracts
  test-support/             infraestrutura reutilizável de testes

content/                    conteúdo pedagógico versionado
scripts/                    automação operacional e checks do repositório
docs/                       contratos especializados e ADRs
```

A árvore física evolui somente quando uma necessidade real justificar nova fronteira.

## 5. Invariantes arquiteturais

### 5.1 Monólito modular primeiro

- Não criar microserviços sem ADR e necessidade comprovada.
- Separar módulos por responsabilidade de domínio, não por tecnologia.
- Não criar novo package, service, factory, adapter ou interface apenas para parecer aderente a um padrão arquitetural.
- Uma abstração deve proteger uma dependência real, viabilizar teste relevante, reduzir duplicação significativa ou atender um use case concreto.

### 5.2 Dependências apontam para dentro

Direção conceitual:

```text
UI / Delivery
    ↓
Application / Use cases
    ↓
Domain contracts
    ↑
Infrastructure adapters
```

Regras atuais importantes:

- `packages/domain/src` não depende de Next.js, React, Drizzle, PostgreSQL, SDK de IA ou outro provider externo;
- `apps/web/server/application` contém orchestration/use cases puros e não depende de Next.js, React, Drizzle ou `packages/db`;
- repository ports são definidos no lado interno que precisa deles;
- `packages/db` implementa os adapters PostgreSQL;
- delivery/composition root pode conhecer application e infrastructure para montar dependências;
- handlers HTTP não acumulam regra substancial de negócio;
- não criar `BaseRepository`, `BaseEntity` ou CRUD genérico.

`pnpm check:workspace` protege parte dessas fronteiras automaticamente, mas não substitui revisão arquitetural.

### 5.3 Dados são contratos

- Mudanças de schema exigem migration.
- Migrations já aplicadas não são reescritas; correções usam migration nova/forward-fix.
- Nunca alterar significado de campo existente sem estratégia explícita de migração.
- Operações que precisam permanecer consistentes devem usar transação.
- Conteúdo publicado e histórico pedagógico não devem perder explicabilidade por conveniência de implementação.

### 5.4 IA é uma dependência não determinística

- Validar por schema toda saída usada estruturalmente quando possível.
- Versionar prompts relevantes.
- Usar timeout e retry limitado nas integrações.
- Falha do provider não pode corromper progresso do aluno.
- Mutation crítica não ocorre apenas porque a IA produziu determinada resposta.
- Novos fluxos de IA precisam de fixtures/evals compatíveis com `docs/QUALITY_STRATEGY.md`.

## 6. Regras por área

### Domain e application

- Prefira tipos de domínio explícitos a objetos genéricos.
- Erros esperados atravessam use cases como resultados tipados conforme os contratos existentes.
- Falhas inesperadas de infraestrutura não devem ser convertidas silenciosamente em sucesso ou erro de domínio falso.
- Dependências temporais e geradores de ID devem ser substituíveis quando a regra precisar de determinismo.

### Learning Engine

- Regras temporais devem receber `Clock`; não espalhe `Date.now()` ou `new Date()` pela lógica de domínio.
- Teste midnight local, timezone, overdue windows e intervalos quando afetados.
- Planner não pode selecionar conteúdo locked sem regra explícita.
- Submit/retry não deve duplicar attempt, progress ou review state.
- Mudanças em SRS/mastery que alterem significado de progresso exigem atenção especial e ADR quando estrutural.

### Database

- Use migration descritiva e forward-only para corrigir migration aplicada.
- Índices devem responder a consultas reais.
- Evite N+1 e round trips desnecessários.
- Queries de ownership devem restringir acesso no servidor; IDs vindos do cliente não provam autorização.
- Não use cascade delete sem avaliar impacto no histórico pedagógico.
- Testes de integração usam PostgreSQL compatível com produção quando comportamento do banco for relevante.

### Authentication e segurança

- Autenticação não substitui autorização por recurso.
- Nunca derive ownership de `ownerId` enviado pelo cliente.
- Cookies, tokens, passwords, transcripts, áudio ou PII não devem aparecer em logs por padrão.
- Secrets ficam somente em ambiente seguro.
- Novos uploads/downloads e fluxos de mídia precisam considerar acesso, retenção e exposição.

### Frontend e design system

Antes de criar controle compartilhado, verifique `@lingo-pilot/ui` e `docs/DESIGN_SYSTEM.md`.

Toda interface aplicável deve considerar:

- mobile-first;
- navegação por teclado e foco visível;
- labels e nomes acessíveis;
- contraste adequado;
- loading, vazio, erro, sucesso e indisponibilidade;
- prevenção de clique duplicado quando necessário;
- `prefers-reduced-motion`;
- informação essencial não dependente somente de cor;
- tokens semânticos do design system em vez de cores/spacing duplicados.

Se duas interfaces resolvem o mesmo problema, prefira a que exige menos decisões do aluno.

Não adicionar dashboards, cards, gráficos, gamificação ou métricas apenas por estética. Cada elemento deve ajudar o aluno a compreender, decidir ou executar algo.

### Conteúdo pedagógico

Conteúdo é dado versionado, não detalhe de componente React.

Mudanças devem preservar, quando aplicável:

- nível CEFR ou nível interno;
- pré-requisitos;
- objetivos de aprendizagem;
- vocabulário/conceitos introduzidos;
- atividades ligadas ao objetivo;
- versão/revisão do conteúdo;
- distinção entre conteúdo fonte e conteúdo gerado/adaptado por IA.

## 7. Código e abstrações

### TypeScript

- `strict` é obrigatório.
- Evite `any`; exceções devem ser locais e justificadas.
- Valide dados nas fronteiras do sistema.
- Nunca confie em payload do cliente, dado legado ou provider externo sem validação apropriada.

### Funções e módulos

- Uma função deve ter responsabilidade clara; tamanho não é métrica isolada de qualidade.
- Prefira composição a herança.
- Evite condicionais profundamente aninhadas quando uma decomposição simples melhorar leitura.
- Não crie abstração para uma única ocorrência sem benefício concreto.
- Evite `utils` genéricos que escondem responsabilidades de domínio.
- KISS e YAGNI têm prioridade sobre aplicação mecânica de patterns.

### Nomes e erros

- Nomes devem expressar intenção de negócio.
- Evite abreviações obscuras.
- Booleanos preferem forma afirmativa: `isCompleted`, `canReview`, `hasAudio`.
- Instantes usam nomes explícitos como `completedAt` e `dueAt`.
- Não engula exceções.
- Logs não substituem tratamento de erro.
- Mensagens ao usuário não expõem detalhes internos.

## 8. Testes e checks por risco

Teste comportamento e invariantes, não detalhes acidentais da implementação.

Mínimo esperado:

- regra pura de domínio/learning → unit test;
- repository, transaction, migration ou banco → integration test;
- componente com comportamento → component test por role/label quando aplicável;
- fluxo browser-first crítico → considerar E2E;
- bug reproduzível → teste de regressão no nível mais baixo capaz de capturá-lo;
- conteúdo → validação de schema/referências;
- IA → fixtures/evals conforme o risco.

Gate canônico antes do PR:

```bash
pnpm db:up
pnpm check
```

`pnpm check` é a fonte operacional obrigatória e atualmente cobre:

```text
lint
-> typecheck
-> test
-> content:validate
-> build
```

Checks especializados são proporcionais ao escopo:

| Mudança                           | Check adicional esperado quando aplicável |
| --------------------------------- | ----------------------------------------- |
| configuração/runtime              | `pnpm env:check`                          |
| schema/migration/infra de banco   | `pnpm db:check` e `pnpm db:smoke`         |
| fluxo browser-first crítico       | `pnpm test:e2e`                           |
| investigação de cobertura         | `pnpm test:coverage`                      |
| auditoria explícita de formatação | `pnpm format:check`                       |

Não transforme um diagnóstico especializado em gate global sem decisão explícita. Não pule check obrigatório por conveniência.

## 9. Matriz rápida de impacto

Antes de finalizar, use esta matriz como lembrete:

| Se alterar                     | Verifique também                                       |
| ------------------------------ | ------------------------------------------------------ |
| `packages/domain`              | invariantes, unit tests, dependências proibidas        |
| `apps/web/server/application`  | use case puro, resultados tipados, ports               |
| `packages/learning`            | `Clock`, invariantes temporais, idempotência           |
| `packages/db`                  | integration test, ownership, transação, N+1            |
| schema/migration               | migration nova, `db:check`, `db:smoke`, recovery       |
| auth                           | ownership server-side, sessão, PII/secrets             |
| `packages/ui` ou UI de feature | primitives existentes, a11y, estados, component test   |
| IA                             | schema, timeout/fallback, prompt version, eval/fixture |
| conteúdo                       | schema, referências, versão, `content:validate`        |
| fluxo crítico no navegador     | E2E e validação manual quando aplicável                |
| configuração/produção          | `docs/PRODUCTION.md` e contratos de runtime            |

## 10. Git e Pull Requests

- Nunca desenvolva diretamente em `main`.
- Uma mudança relevante usa branch dedicada.
- Prefixos esperados: `feature/`, `bugfix/`, `hotfix/`, `docs/`, `refactor/`, `test/`.
- Commits seguem Conventional Commits quando possível: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- PR deve ter escopo coeso e revisável.
- Não misture refactor amplo com feature sem necessidade.
- Use `.github/PULL_REQUEST_TEMPLATE.md`.
- Não faça merge com check obrigatório falhando.

Todo PR deve deixar claro problema, solução, testes, riscos, dados/migrations quando houver, documentação afetada e rollback/forward-fix aplicável.

## 11. Documentação e ADR

Documentação faz parte da implementação quando a mudança altera:

- comportamento visível;
- contrato de API;
- modelo de dados;
- arquitetura/boundaries;
- processo operacional;
- configuração;
- segurança/privacidade;
- estratégia pedagógica;
- decisão que afeta implementações futuras.

Não atualize documentação por reflexo quando o contrato não mudou. Evite repetir o mesmo conteúdo em vários arquivos.

Crie ADR quando a decisão for estrutural, difícil de desfazer ou tiver trade-offs relevantes, conforme `docs/ARCHITECTURE.md`.

## 12. Auto code review

Antes de pedir review humano, releia o diff inteiro como se não tivesse escrito a mudança.

Checklist mínimo:

- [ ] resolve exatamente a issue e seus critérios de aceite;
- [ ] não inclui comportamento não solicitado;
- [ ] caminhos de erro relevantes foram tratados;
- [ ] autorização e integridade de dados estão corretas;
- [ ] retries/duplicidade/concorrência foram considerados quando aplicável;
- [ ] não introduz N+1, round trip ou acoplamento desnecessário;
- [ ] UI cobre estados e acessibilidade aplicáveis;
- [ ] testes protegem regra nova e regressões relevantes;
- [ ] não há abstração prematura, código morto, debug ou TODO indevido;
- [ ] documentação/ADR estão coerentes;
- [ ] rollback ou forward-fix é conhecido quando necessário;
- [ ] `pnpm check` passou no head final e checks especializados aplicáveis foram executados.

## 13. Quando parar e pedir decisão

Pare e peça decisão quando houver:

- alteração incompatível de dados sem estratégia de migração;
- risco real de perda de dados;
- mudança relevante de escopo do produto;
- requisito pedagógico contraditório;
- novo fornecedor com custo ou lock-in relevante;
- impacto de privacidade não previsto;
- duas opções arquiteturais com trade-offs substancialmente diferentes;
- impossibilidade de satisfazer critérios de aceite sem expandir materialmente a issue.

Não pare por detalhes que podem ser resolvidos inspecionando código, documentação ou testes existentes.

## 14. Definition of Done

Antes de declarar uma tarefa concluída:

1. execute o gate e os checks especializados aplicáveis;
2. faça validação manual do fluxo quando o comportamento visível exigir;
3. complete o auto code review;
4. confirme documentação e migrations quando aplicáveis;
5. confira `docs/DEFINITION_OF_DONE.md`.

“Funciona na minha máquina” não é Definition of Done.

## 15. Regra final

Não altere stack, biblioteca estrutural ou arquitetura silenciosamente. Não desabilite lint, typecheck ou teste para “fazer passar”. Não remova teste quebrado sem entender o contrato que ele protege.

A melhor mudança é a menor mudança coesa que resolve o problema sem empurrar complexidade desnecessária para o futuro.
