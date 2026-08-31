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

Configura preferências globais da experiência de aprendizado para um usuário.

- `userId`
- `interfaceLocale`
- `timezone`
- `dailyGoalMinutes`
- preferências de áudio/speaking

`LearnerProfile` não representa uma jornada de idioma específica.

### LanguageProfile

Representa uma jornada idioma fonte → idioma alvo.

Campos conceituais:

- `id`
- `userId`
- `sourceLanguage`
- `targetLanguage`
- `startingLevel`
- `currentEstimatedLevel`
- `status`
- `createdAt`

Um usuário poderá ter múltiplos `LanguageProfile`s no futuro.

**Regra de ownership pedagógico:** progresso, sessões, attempts, review e mastery pertencem a uma jornada identificável por `LanguageProfile`, direta ou indiretamente através de `Enrollment`. Não anexar todo o histórico pedagógico apenas ao `User`.

## 3. Curriculum

### Course

Curso publicável, por exemplo `pt-BR → en`.

### Enrollment

Representa a matrícula de um `LanguageProfile` em um `Course`.

Campos conceituais:

- `id`
- `languageProfileId`
- `courseId`
- `entryPointLevel`
- `placementSource`
- `status`
- `enrolledAt`

Valores iniciais de `placementSource`:

```text
zero
manual
```

No futuro podem existir fontes como `diagnostic` ou `teacher`, sem alterar o significado das existentes.

O `entryPointLevel` define de onde a trilha começa para fins de elegibilidade. Ele **não** equivale a mastery.

Conteúdo anterior ao entry point pode ser considerado **placement-waived** pelo serviço de elegibilidade para não obrigar um falso iniciante a refazer toda a trilha, mas essa dispensa:

- não cria `Attempt`;
- não cria `ReviewEvent`;
- não cria `ConceptEvidence` positivo;
- não marca `MasteryState` como dominado;
- deve permanecer auditável como motivo de elegibilidade.

Para a V1 deve existir no máximo um `Enrollment` ativo por `LanguageProfile + Course`.

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

A elegibilidade precisa distinguir:

- prerequisite satisfeito por progresso real;
- prerequisite dispensado pelo `Enrollment.entryPointLevel`;
- prerequisite ainda não satisfeito.

Dispensa por placement nunca deve ser transformada silenciosamente em evidência de aprendizado.

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
- `languageProfileId`
- `enrollmentId` quando a atividade pertence a um curso matriculado
- `submittedAt`
- resposta normalizada/metadata apropriada;
- resultado;
- hints usados;
- duração quando útil;
- evaluation source (`deterministic`, `rule`, `ai`, `human`).

Tentativas não devem ser sobrescritas para “guardar só a última”.

## 7. Lesson Progress

### LessonProgress

Estado derivado/persistido de uma lesson para um `Enrollment`.

- `enrollmentId`
- `lessonId`
- `contentRevisionId`
- `status`

Estados possíveis:

```text
locked
available
in_progress
completed
```

Completion deve depender de regras explícitas, não só de abrir a última tela.

Uma lesson anterior ao entry point pode ser dispensada para elegibilidade sem receber estado `completed`; a origem dessa dispensa pertence ao `Enrollment`/resultado de elegibilidade, não a um completion falso.

## 8. Study Session

### StudySession

Sessão planejada para uma jornada matriculada em uma janela de estudo.

- `id`
- `languageProfileId`
- `enrollmentId`
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

Deve registrar motivo de seleção suficiente para debug e analytics, incluindo quando elegibilidade decorreu de entry point/placement.

## 9. Review

### MemoryItem

Unidade que pode ser agendada para recuperação espaçada.

Exemplos:

- palavra;
- phrase pattern;
- conceito com pergunta específica;
- associação áudio → significado.

### ReviewState

Estado atual do scheduler para `MemoryItem + LanguageProfile`.

Pode armazenar parâmetros do algoritmo como estabilidade, dificuldade, última revisão e `dueAt`.

### ReviewEvent

Registro imutável de uma revisão e sua avaliação.

## 10. Progress & Mastery

### ConceptEvidence

Evidência de desempenho relacionada a um `Concept` e `LanguageProfile`.

Pode ser derivada de attempt, review ou avaliação específica.

Placement manual não gera `ConceptEvidence` positivo.

### MasteryState

Resumo atual de confiança/domínio para `LanguageProfile + Concept`.

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

Contexto de conversa associado a um `LanguageProfile`.

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

## 13. Onboarding transaction

A conclusão inicial do onboarding deve criar/garantir de forma idempotente:

```text
User
  ↓
LearnerProfile
  ↓
LanguageProfile
  ↓
Enrollment → Course
```

A operação deve ser transacional quando persistida no mesmo banco. Retry/refresh não pode criar duas jornadas ou duas matrículas ativas equivalentes.

Use cases conceituais esperados:

- `CreateOrUpdateLearnerProfile`
- `CreateLanguageProfile`
- `EnrollLanguageProfileInCourse`
- ou um application use case de onboarding que orquestre os três preservando seus limites.

## 14. Invariantes importantes

1. Um `LanguageProfile` pertence a um único `User`.
2. Um `Enrollment` pertence a um único `LanguageProfile` e um único `Course`.
3. Para a V1, não existem dois enrollments ativos para o mesmo `LanguageProfile + Course`.
4. Um Attempt pertence ao `LanguageProfile` que executou a Activity.
5. Um usuário não pode acessar dados pedagógicos de outro usuário.
6. Uma Activity apresentada referencia uma `ContentRevision` específica.
7. Conteúdo publicado não muda semanticamente em lugar; cria nova revision.
8. `ReviewEvent` não é atualizado retroativamente.
9. `SessionItem` concluído não pode gerar duplicidade de progresso após retry.
10. Lesson só desbloqueia quando regras de pré-requisito forem atendidas ou explicitamente dispensadas por entry point.
11. Dispensa por placement não cria mastery, completion ou review fictícios.
12. AI failure nunca deve marcar resposta como correta por default.
13. Timezone influencia “dia de estudo”, mas timestamps persistidos permanecem UTC.
14. Exclusão de conta deve respeitar política de retenção definida.
15. Onboarding reentrante deve preservar unicidade de `LanguageProfile`/`Enrollment` pretendidos.

## 15. Vocabulário proibido/ambíguo

Evitar nomes genéricos sem definição:

- `score` sem dizer score de quê;
- `progress` como única tabela para todos os estados;
- `level` para dificuldade de exercício e CEFR ao mesmo tempo;
- `lessonData` como blob sem schema;
- `userState` agregando estados não relacionados;
- `aiResult` sem tipo e schema;
- `learnerId` sem definir se significa `User`, `LearnerProfile` ou `LanguageProfile`.

## 16. Modelo físico

O modelo físico será definido em migrations e `packages/db`. Ele pode normalizar ou materializar informações por performance, mas não deve apagar as distinções conceituais deste documento sem decisão explícita.
