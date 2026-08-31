# Modelo de Domínio — LingoPilot

Este documento define o vocabulário inicial do domínio. Nomes podem evoluir via ADR/PR, mas implementações devem evitar criar sinônimos para os mesmos conceitos.

## 1. Identity

### User

Representa a identidade autenticada.

Campos conceituais:

- `id`
- `email` ou identidade externa
- `createdAt`
- `status`

`User` não contém diretamente regras pedagógicas.

## 2. Learner

### LearnerProfile

Configura a experiência de aprendizado.

- `userId`
- `interfaceLocale`
- `timezone`
- `dailyGoalMinutes`
- preferências de áudio/speaking

### LanguageProfile

Representa uma jornada idioma fonte → idioma alvo.

- `sourceLanguage`
- `targetLanguage`
- `startingLevel`
- `currentEstimatedLevel`
- `status`

Um usuário poderá ter múltiplos LanguageProfiles no futuro.

## 3. Curriculum

### Course

Curso publicável, por exemplo `pt-BR → en`.

### Level

Agrupamento de progressão, como A0, A1 e A2.

### Unit

Conjunto coerente de objetivos.

### Lesson

Unidade instrucional que introduz e pratica conceitos definidos.

### LearningObjective

Resultado observável esperado após uma lesson ou unit.

Exemplo: “produzir frases afirmativas simples com `be` para identidade”.

### Prerequisite

Relação explícita de elegibilidade entre conteúdos/conceitos.

## 4. Knowledge graph leve

### Concept

Unidade pedagógica rastreável.

Categorias iniciais:

- grammar;
- vocabulary;
- phrase pattern;
- pronunciation;
- pragmatic function;
- reading skill;
- listening skill;
- writing skill;
- speaking skill.

### VocabularyItem

Entrada lexical ou multiword expression.

Não assumir que “uma palavra” corresponde sempre a uma unidade pedagógica.

### ConceptRelation

Pode representar:

- prerequisite;
- reinforces;
- contrastsWith;
- relatedTo.

A V1 deve evitar construir um grafo excessivamente complexo. Relações entram conforme uso real.

## 5. Content

### ContentItem

Entidade editorial lógica.

### ContentRevision

Snapshot versionado e publicável de um ContentItem.

Estados sugeridos:

```text
draft → review → published → retired
```

Uma tentativa do aluno deve referenciar a revisão efetivamente apresentada.

### ContentBlock

Bloco renderizável dentro de lesson/readings/dialogues.

Exemplos:

- explanation;
- example;
- rule;
- common error;
- callout;
- media;
- checkpoint.

## 6. Activity & Attempt

### Activity

Uma tarefa que o aluno executa.

Possui:

- tipo;
- prompt;
- critérios de avaliação;
- conceitos avaliados;
- modalidade;
- difficulty metadata;
- revision.

### Attempt

Registro imutável de uma submissão relevante.

- `activityId`
- `contentRevisionId`
- `learnerId`
- `submittedAt`
- resposta normalizada/metadata apropriada;
- resultado;
- hints usados;
- duração quando útil;
- evaluation source (`deterministic`, `rule`, `ai`, `human`).

Tentativas não devem ser sobrescritas para “guardar só a última”.

## 7. Lesson Progress

### LessonProgress

Estado derivado/persistido de uma lesson para um aluno.

Estados possíveis:

```text
locked
available
in_progress
completed
```

Completion deve depender de regras explícitas, não só de abrir a última tela.

## 8. Study Session

### StudySession

Sessão planejada para um aluno em uma janela de estudo.

- `id`
- `learnerId`
- `plannedAt`
- `localStudyDate`
- `goalMinutes`
- `plannerVersion`
- `status`

### SessionItem

Item ordenado da sessão.

Tipos:

- learn;
- review;
- retrieval;
- listening;
- speaking;
- reading;
- writing;
- checkpoint.

Deve registrar motivo de seleção suficiente para debug e analytics.

## 9. Review

### MemoryItem

Unidade que pode ser agendada para recuperação espaçada.

Exemplos:

- palavra;
- phrase pattern;
- conceito com pergunta específica;
- associação áudio → significado.

### ReviewState

Estado atual do scheduler para MemoryItem + Learner.

Pode armazenar parâmetros do algoritmo como estabilidade, dificuldade, última revisão e `dueAt`.

### ReviewEvent

Registro imutável de uma revisão e sua avaliação.

## 10. Progress & Mastery

### ConceptEvidence

Evidência de desempenho relacionada a um Concept.

Pode ser derivada de attempt, review ou avaliação específica.

### MasteryState

Resumo atual de confiança/domínio para Learner + Concept.

Não é “verdade absoluta”; é uma projeção calculada a partir de evidências.

Campos conceituais:

- score/confidence;
- lastEvidenceAt;
- independentSuccesses;
- recentFailures;
- modalitiesObserved;
- algorithmVersion.

### ProgressEvent

Evento interno auditável de mudança pedagógica relevante.

## 11. Skills

### ListeningAttempt

Especialização/metadata de Attempt para compreensão auditiva.

### SpeakingAttempt

Referência segura a mídia temporária/persistida, transcript, evaluation e policy metadata.

### WritingAttempt

Texto do usuário exige política de privacidade e pode receber avaliação estruturada.

## 12. AI Coaching

### TutorConversation

Contexto de conversa associado a um LanguageProfile.

### TutorTurn

Mensagem, metadata do modelo/prompt e limites pedagógicos aplicados.

### AIEvaluation

Resultado estruturado de uma avaliação de writing/speaking.

Deve registrar:

- provider/model;
- prompt version;
- schema version;
- input references;
- resultado validado;
- timestamp;
- status/fallback.

## 13. Invariantes importantes

1. Um Attempt pertence ao Learner que executou a Activity.
2. Um usuário não pode acessar dados pedagógicos de outro usuário.
3. Uma Activity apresentada referencia uma ContentRevision específica.
4. Conteúdo publicado não muda semanticamente em lugar; cria nova revision.
5. ReviewEvent não é atualizado retroativamente.
6. SessionItem concluído não pode gerar duplicidade de progresso após retry.
7. Lesson só desbloqueia quando regras de pré-requisito forem atendidas.
8. AI failure nunca deve marcar resposta como correta por default.
9. Timezone influencia “dia de estudo”, mas timestamps persistidos permanecem UTC.
10. Exclusão de conta deve respeitar política de retenção definida.

## 14. Vocabulário proibido/ambíguo

Evitar nomes genéricos sem definição:

- `score` sem dizer score de quê;
- `progress` como única tabela para todos os estados;
- `level` para dificuldade de exercício e CEFR ao mesmo tempo;
- `lessonData` como blob sem schema;
- `userState` agregando estados não relacionados;
- `aiResult` sem tipo e schema.

## 15. Modelo físico

O modelo físico será definido em migrations e `packages/db`. Ele pode normalizar ou materializar informações por performance, mas não deve apagar as distinções conceituais deste documento sem decisão explícita.
