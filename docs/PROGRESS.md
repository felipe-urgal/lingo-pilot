# Progresso, domínio e histórico — LingoPilot

Este documento define o contrato de leitura de progresso iniciado pela issue #27. Ele complementa `docs/UX_AND_DESIGN.md`, `docs/VISION.md`, `docs/DATABASE.md` e os contratos de mastery/sessão existentes.

## Objetivo

A tela de Progresso deve ajudar o aluno a responder, com fatos pedagógicos reais:

1. onde estou na trilha;
2. o que concluí;
3. o que estou dominando;
4. onde preciso reforçar;
5. como foram minhas sessões recentes.

A tela não é um dashboard de engajamento. XP, streak e tempo de uso não substituem completion curricular, evidência ou mastery.

## Sinais separados

### Completion curricular

Uma lesson conta como concluída somente quando existe `LessonProgress.status=completed` persistido para a matrícula.

Placement manual A1/A2 altera elegibilidade e posição de entrada, mas não cria completion. Lessons abaixo do entry point podem aparecer como `waived` na elegibilidade e continuam semanticamente diferentes de `completed`.

### Concept mastery

Domínio é derivado exclusivamente de `MasteryState`, que por sua vez vem de `ConceptEvidence` produzido por Attempts/Reviews reais.

O resumo inicial apresenta:

- quantidade de conceitos com `MasteryState`;
- média de `scorePercent` quando existir evidência;
- média de `confidencePercent` quando existir evidência.

Concluir uma lesson sem evidência suficiente não cria mastery artificial para preencher a interface.

### Weak concepts

A lista de reforço usa a mesma regra de weak concept do learning loop atual: score abaixo do limiar com confiança mínima suficiente. O read model apenas ordena e limita estados reais; não sintetiza fraqueza a partir de placement, tempo de estudo ou completion.

### Review backlog

O número de revisões pendentes é a contagem de `MemoryItem.dueAt <= now` da matrícula autenticada. O progresso não replica o scheduler nem inventa itens de revisão.

## Onde o aluno está

O application layer reutiliza `evaluateCurriculum` e `nextEligibleLesson`.

A prioridade visual é:

1. lesson `in_progress`;
2. próxima lesson `available`;
3. última lesson com progresso persistido, quando não há próxima lesson;
4. nível do entry point como fallback para uma jornada sem progresso.

Isso evita dois erros:

- placement ser mostrado como lesson concluída;
- uma jornada avançada voltar visualmente ao nível de entrada quando todo o conteúdo disponível já foi concluído.

## Histórico de sessões

O histórico usa `StudySession.localStudyDate`, que já é a data civil calculada no timezone do `LearnerProfile` no momento do planejamento. A UI formata essa data sem reconvertê-la a partir de UTC.

Cada item recente resume apenas estado persistido:

- status da sessão;
- quantidade de itens `lesson` concluídos;
- quantidade de itens `review` concluídos;
- quantidade de itens `skipped`.

`skipped` continua distinto de aprendizagem concluída.

## Paginação e queries

O primeiro recorte usa `ProgressRepository.loadProgressSnapshot` como read model ownership-scoped.

Regras:

- `historyLimit` é limitado server-side;
- `historyOffset` não pode ser negativo;
- weak concepts também possuem limite server-side;
- sessões são buscadas por `Enrollment` e ordenadas por `localStudyDate`/`createdAt` descendente;
- a query traz `limit + 1` para indicar se existe próxima página;
- `SessionItem`s de todas as sessões visíveis são carregados em uma única query com `IN (...)` e agrupados em memória, evitando N+1;
- mastery é agregado no PostgreSQL em vez de carregar todo o histórico de evidência;
- backlog é contado no PostgreSQL.

Os índices existentes já suportam o recorte:

- `study_sessions_enrollment_local_date_unique` para enrollment + data local;
- `memory_items_due_queue_idx` para fila vencida;
- `mastery_states_weak_idx` para weak concepts;
- PK/unique de `lesson_progress` para progresso por matrícula + lesson.

Nenhuma migration adicional é necessária neste recorte.

## Ownership e privacidade

O browser nunca envia `userId`/`enrollmentId` como prova de autorização. A aplicação resolve a jornada pelo usuário autenticado e passa o `Enrollment` server-side ao read model.

Todas as queries de progresso filtram por esse enrollment.

A tela não lê nem expõe respostas textuais de Attempts/Reviews. O recorte também não adiciona eventos de analytics de produto; qualquer analytics futuro pertence à #46 e deve continuar sem respostas livres por padrão.

## UX inicial

`/app/progress` mantém quatro blocos simples:

- **Onde você está** — nível, unidade e próxima/atual lesson;
- **Aprendizado** — completion curricular e mastery em cards separados;
- **Reforçar** — backlog e weak concepts reais;
- **Histórico recente** — sessões persistidas com paginação curta.

A página usa HTML semântico, links nativos e layout de uma coluna em telas pequenas. O acesso `Hoje`/`Progresso` fica no shell protegido.

## Empty states

Usuário novo deve ver:

- zero lessons concluídas;
- nenhuma estimativa de mastery quando não existe `MasteryState`;
- nenhum weak concept sem evidência suficiente;
- histórico vazio até existir `StudySession`.

Entry point manual não altera esses estados artificialmente.

## Continuidade da #27

Ficam para recortes seguintes da mesma issue:

- domínio por modalidade quando houver evidência representativa;
- drill-down simples de status por lesson;
- evolução adicional de histórico/filtros se necessária;
- fechamento dos critérios restantes de UI e queries após dogfood do primeiro recorte.

Relatórios avançados e analytics de produto permanecem fora de escopo.
