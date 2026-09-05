# Progresso, domínio e histórico — LingoPilot

Este documento define o contrato de leitura de progresso da issue #27. Ele complementa `docs/UX_AND_DESIGN.md`, `docs/VISION.md`, `docs/DATABASE.md` e os contratos de mastery/sessão existentes.

## Objetivo

A tela de Progresso deve ajudar o aluno a responder, com fatos pedagógicos reais:

1. onde estou na trilha;
2. o que concluí;
3. o que estou dominando;
4. em quais modalidades já existe evidência observada;
5. onde preciso reforçar;
6. como foram minhas sessões recentes.

A tela não é um dashboard de engajamento. XP, streak e tempo de uso não substituem completion curricular, evidência ou mastery.

## Sinais separados

### Completion curricular

Uma lesson conta como concluída somente quando existe `LessonProgress.status=completed` persistido para a matrícula.

Placement manual A1/A2 altera elegibilidade e posição de entrada, mas não cria completion. Lessons abaixo do entry point podem aparecer como `waived` na elegibilidade e continuam semanticamente diferentes de `completed`.

### Concept mastery

Domínio é derivado exclusivamente de `MasteryState`, que por sua vez vem de `ConceptEvidence` produzido por Attempts/Reviews reais.

O resumo apresenta:

- quantidade de conceitos com `MasteryState`;
- média de `scorePercent` quando existir evidência;
- média de `confidencePercent` quando existir evidência.

Concluir uma lesson sem evidência suficiente não cria mastery artificial para preencher a interface.

### Evidência por modalidade

`MasteryState` é uma projeção **por conceito**, não por reading/listening/writing/speaking. A #27 não cria um segundo algoritmo de mastery para habilidades.

O read model agrega `ConceptEvidence` real por modalidade e expõe somente:

- quantidade de evidências observadas;
- quantidade de outcomes corretos;
- taxa correta derivada na application layer.

A UI usa esses dados como **desempenho observado**, sempre junto do tamanho da amostra. A taxa não deve ser chamada de domínio, mastery, nível ou proficiência.

As modalidades de leitura exibidas são:

- `reading` → Leitura;
- `listening` → Escuta;
- `writing` → Escrita;
- `speaking` → Fala.

`mixed` continua sendo evidência válida para o cálculo pedagógico por conceito, mas não vira uma quinta habilidade visual porque não pode ser atribuída honestamente a uma modalidade específica.

Quando não existe evidência para uma modalidade, a UI não preenche um zero artificial nem infere habilidade a partir de completion, placement ou tempo estudado.

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

## Drill-down curricular

O status de cada lesson é derivado da mesma saída de `evaluateCurriculum` usada pelo Study Engine. A tela não recalcula prerequisites nem possui regra paralela.

Estados exibidos:

- `completed` → **Concluída**;
- `in_progress` → **Em andamento**;
- `available` → **Disponível**;
- `waived` → **Dispensada pelo ponto de entrada**;
- `locked` → **Bloqueada**.

`waived` nunca soma no contador de lessons concluídas.

A UI agrupa lessons por nível e unidade usando `<details>/<summary>` nativos. O nível atual pode iniciar aberto; os demais permanecem recolhíveis para reduzir densidade sem esconder a informação.

## Histórico de sessões

O histórico usa `StudySession.localStudyDate`, que já é a data civil calculada no timezone do `LearnerProfile` no momento do planejamento. A UI formata essa data sem reconvertê-la a partir de UTC.

Cada item recente resume apenas estado persistido:

- status da sessão;
- quantidade de itens `lesson` concluídos;
- quantidade de itens `review` concluídos;
- quantidade de itens `skipped`.

`skipped` continua distinto de aprendizagem concluída.

## Paginação e queries

`ProgressRepository.loadProgressSnapshot` é o read model ownership-scoped da página.

Regras:

- `historyLimit` é limitado server-side;
- `historyOffset` não pode ser negativo e possui cap defensivo;
- a application layer também limita o número máximo de páginas aceito pela URL;
- weak concepts possuem limite server-side;
- sessões são buscadas por `Enrollment` e ordenadas por `localStudyDate`/`createdAt` descendente;
- a query traz `limit + 1` para indicar se existe próxima página;
- `SessionItem`s de todas as sessões visíveis são carregados em uma única query com `IN (...)` e agrupados em memória, evitando N+1;
- mastery é agregado no PostgreSQL em vez de carregar todo o histórico de evidência;
- backlog é contado no PostgreSQL;
- evidência por modalidade é agregada no PostgreSQL com `GROUP BY modality`, sempre filtrada pelo mesmo `Enrollment`.

Os índices existentes já suportam o recorte:

- `study_sessions_enrollment_local_date_unique` para enrollment + data local;
- `memory_items_due_queue_idx` para fila vencida;
- `mastery_states_weak_idx` para weak concepts;
- `concept_evidence_enrollment_concept_idx`, cujo prefixo por enrollment atende a leitura agregada atual;
- PK/unique de `lesson_progress` para progresso por matrícula + lesson.

Nenhuma migration adicional é necessária na #27.

## Ownership e privacidade

O browser nunca envia `userId`/`enrollmentId` como prova de autorização. A aplicação resolve a jornada pelo usuário autenticado e passa o `Enrollment` server-side ao read model.

Todas as queries de progresso filtram por esse enrollment.

A tela não lê nem expõe respostas textuais de Attempts/Reviews. A agregação por modalidade lê apenas metadata estruturada de `ConceptEvidence`: modalidade e outcome.

A #27 também não adiciona eventos de analytics de produto; qualquer analytics futuro pertence à #46 e deve continuar sem respostas livres por padrão.

## UX

`/app/progress` mantém blocos simples:

- **Onde você está** — nível, unidade e próxima/atual lesson;
- **Aprendizado** — completion curricular e mastery em cards separados;
- **Habilidades** — evidência observada por modalidade com tamanho da amostra;
- **Trilha** — drill-down simples dos status de lessons;
- **Reforçar** — backlog e weak concepts reais;
- **Histórico recente** — sessões persistidas com paginação curta.

A página usa HTML semântico, links nativos, `<details>/<summary>` e layout de uma coluna em telas pequenas. O acesso `Hoje`/`Progresso` fica no shell protegido.

Resumos de contagem derivados de `StudySession.items` devem escolher palavras completas por cardinalidade (`1 revisão`, `0 revisões`, `2 revisões`) em vez de montar plurais por concatenação de sufixo. O mesmo contrato vale para o resumo de sessão concluída e para o número de revisões do plano atual; a copy nunca altera nem substitui a contagem persistida.

## Empty states

Usuário novo deve ver:

- zero lessons concluídas;
- nenhuma estimativa de mastery quando não existe `MasteryState`;
- nenhuma habilidade/modalidade preenchida quando não existe `ConceptEvidence` específico;
- nenhum weak concept sem evidência suficiente;
- histórico vazio até existir `StudySession`.

Entry point manual não altera esses estados artificialmente. O drill-down pode mostrar lessons anteriores como `waived`, deixando explícito que foram dispensadas e não concluídas.

## Limites da #27

A #27 não adiciona:

- score de habilidade paralelo ao mastery;
- social comparison ou ranking;
- relatórios avançados;
- filtros complexos de histórico sem necessidade observada;
- analytics de produto.

Evoluções de listening/reading/writing/speaking devem reutilizar `ConceptEvidence` e, quando necessário, propor um modelo de skill mastery próprio em issue/ADR específica em vez de reinterpretar esta taxa observada.
