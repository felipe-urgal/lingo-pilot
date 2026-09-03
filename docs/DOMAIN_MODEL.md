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

Campos V1 implementados pela #17:

- `userId`
- `interfaceLocale` — atualmente `pt-BR`;
- `timezone` — IANA timezone do aluno;
- `dailyGoalMinutes`;
- `primaryGoal` opcional e estruturado (`conversation`, `travel`, `work`, `study`, `other`);
- `createdAt`;
- `updatedAt`.

Preferências de áudio/speaking podem entrar quando as skills correspondentes existirem.

`LearnerProfile` não representa uma jornada de idioma específica.

### LanguageProfile

Representa uma jornada idioma fonte → idioma alvo.

Campos V1:

- `id`
- `userId`
- `sourceLanguage`
- `targetLanguage`
- `startingLevel`
- `currentEstimatedLevel`
- `status`
- `createdAt`
- `updatedAt`

Na primeira vertical, `sourceLanguage=pt-BR`, `targetLanguage=en` e `startingLevel` aceita A0/A1/A2. `currentEstimatedLevel` começa `null`: selecionar A1/A2 manualmente não é uma estimativa de domínio.

Um usuário poderá ter múltiplos `LanguageProfile`s no futuro. Na V1, a persistência garante unicidade para a combinação `userId + sourceLanguage + targetLanguage`.

**Regra de ownership pedagógico:** progresso, sessões, attempts, review e mastery pertencem a uma jornada identificável por `LanguageProfile`, direta ou indiretamente através de `Enrollment`. Não anexar todo o histórico pedagógico apenas ao `User`.

## 3. Curriculum

### Course

Curso publicável, por exemplo `pt-BR → en`.

A #18 introduz o registry orientado por dados para `course.en.ptbr.v1`: a aplicação monta o catálogo a partir dos documentos versionados em `content/` depois de executar o mesmo parser/validator usado pelo pipeline editorial. UI não hardcodeia a hierarquia Course → Level → Unit → Lesson.

O catálogo bootstrap deste recorte contém a estrutura A0/A1/A2 e uma única lesson de orientação do produto em A0. Isso exercita os contratos de elegibilidade/Today/Lesson Player sem representar a migração editorial do curso A0→A2, que continua pertencendo às issues de conteúdo.

### Enrollment

Representa a matrícula de um `LanguageProfile` em um `Course`.

Campos V1:

- `id`
- `languageProfileId`
- `courseId`
- `entryPointLevel`
- `placementSource`
- `status`
- `enrolledAt`
- `updatedAt`

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
- não cria `LessonProgress.completed`;
- permanece auditável como motivo de elegibilidade.

Para a V1 existe no máximo um `Enrollment` por `LanguageProfile + Course`, protegido por constraint de unicidade. O estado inicial suportado é `active`.

### Level

Agrupamento de progressão, como A0, A1 e A2.

### Unit

Conjunto coerente de objetivos.

### Lesson

Unidade instrucional que introduz e pratica conceitos definidos.

A lesson usada em uma sessão é identificada por `id + schemaVersion + revision`; sessão/progresso não devem reinterpretar silenciosamente uma revision nova como se fosse a mesma experiência já iniciada.

### LearningObjective

Resultado observável esperado após uma lesson ou unit.

Exemplo: “produzir frases afirmativas simples com `be` para identidade”.

### Prerequisite

Relação explícita de elegibilidade entre conteúdos/conceitos.

A elegibilidade distingue:

- prerequisite satisfeito por progresso real (`progress-satisfied`);
- prerequisite dispensado pelo `Enrollment.entryPointLevel` (`placement-waived`);
- prerequisite ainda não satisfeito (`prerequisite-missing`).

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

Estados:

```text
draft → review → published → retired
```

Sessões e progresso de lesson devem referenciar a revision efetivamente apresentada. Attempts, quando existirem, seguem o mesmo princípio.

### ContentBlock

Bloco renderizável dentro de lesson/readings/dialogues.

Tipos executáveis iniciais:

- explanation;
- rule;
- example;
- comparison;
- common-error;
- vocabulary;
- pronunciation;
- media;
- checkpoint.

O Lesson Player da #20 renderiza esses tipos pelo discriminator validado. Um tipo desconhecido não é interpretado como HTML/texto arbitrário: a UI mostra fallback seguro e registra somente metadata técnica do bloco/tipo para diagnóstico.

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

O engine executável de Activity começa na #21; o Lesson Player da #20 cobre `ContentBlock`, não tenta antecipar avaliação de exercícios.

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

Estado persistido de uma lesson para um `Enrollment`.

Campos implementados nas #18–#20:

- `enrollmentId`;
- `lessonId`;
- `schemaVersion`;
- `revision`;
- `status` (`in_progress | completed`);
- `currentBlockIndex`;
- `startedAt`;
- `completedAt`;
- `updatedAt`.

`locked`, `available` e `waived` são resultados de elegibilidade calculados, não estados persistidos como falso progresso. A persistência começa quando uma lesson é realmente iniciada.

Completion depende de ação explícita no último passo do Lesson Player. Abrir/recarregar a última tela não conclui a lesson. A posição é gravada por transição compare-and-set: o POST informa o índice esperado e o repository só avança/retrocede se esse índice ainda for o persistido, evitando salto por submit duplicado.

Se uma lesson `in_progress` passar a apontar para outra `schemaVersion/revision`, a retomada é bloqueada como `revision-mismatch/revision-conflict`. O histórico permanece preservado para uma política explícita de migration/forward-fix.

Uma lesson anterior ao entry point pode ser dispensada para elegibilidade sem receber estado `completed`; a origem dessa dispensa pertence ao resultado de elegibilidade/SessionItem, não a um completion falso.

## 8. Study Session

### StudySession

Sessão planejada para um `Enrollment` em uma data civil de estudo.

Campos implementados na #19:

- `id`;
- `enrollmentId`;
- `localStudyDate`;
- `plannerVersion`;
- `status` (`planned | in_progress | completed | abandoned`);
- `createdAt`;
- `startedAt`;
- `completedAt`;
- `updatedAt`;
- `items` ordenados.

`localStudyDate` é calculado a partir do instante UTC + timezone do `LearnerProfile`; timestamps permanecem UTC. A V1 protege `Enrollment + localStudyDate` por unicidade, portanto dois refreshes/dispositivos convergem para a mesma sessão diária.

O planner atual é deliberadamente mínimo e versionado como `today-shell-v1`: seleciona uma lesson `in_progress` para retomada ou a próxima lesson elegível. O algoritmo completo de prioridade/review/tempo continua na #25.

### SessionItem

Item ordenado da sessão.

A foundation atual suporta `kind=lesson` e registra:

- `resourceId`;
- `schemaVersion + revision` do conteúdo planejado;
- `position`;
- `reasonCode` (`NEW_ELIGIBLE_LESSON | RESUME_IN_PROGRESS`);
- `eligibilityReason` (`progress-satisfied | placement-waived | resume-in-progress`);
- `estimatedMinutes`;
- `status`;
- timestamps.

Novos tipos — review, retrieval, listening, speaking, reading, writing, checkpoint — entram quando os respectivos engines existirem; não criar itens fictícios para antecipar roadmap.

`/app/today` materializa ou relê a sessão diária e apresenta uma ação principal `Começar estudo`/`Continuar estudo`. O CTA não aceita `lessonId` arbitrário como autorização: o servidor relê sessão/item sob o `Enrollment` autenticado e revalida conteúdo/revision/elegibilidade antes do start.

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

A #17 implementa um application use case único de onboarding que cria/garante de forma idempotente:

```text
User (já autenticado)
  ↓
LearnerProfile
  ↓
LanguageProfile
  ↓
Enrollment → Course
```

`LearnerProfile + LanguageProfile + Enrollment` são persistidos em uma única transação PostgreSQL. Retry/refresh não cria duas jornadas ou duas matrículas equivalentes.

A reentrada do onboarding atualiza somente preferências globais (`interfaceLocale`, `timezone`, `dailyGoalMinutes`, `primaryGoal`) e preserva `startingLevel`, `entryPointLevel` e `placementSource` já persistidos. Mudar placement depois da criação passa a exigir uma regra de produto explícita em issue própria; não é efeito colateral de editar preferências.

O use case pertence à camada application e depende de `LearnerJourneyRepository`, relógio e gerador de IDs por contratos. Next.js e Drizzle permanecem adapters externos.

## 14. Invariantes importantes

1. Um `LanguageProfile` pertence a um único `User`.
2. Um `Enrollment` pertence a um único `LanguageProfile` e um único `Course`.
3. Para a V1, não existem dois enrollments para o mesmo `LanguageProfile + Course`.
4. Um Attempt pertence ao `LanguageProfile` que executou a Activity.
5. Um usuário não pode acessar dados pedagógicos de outro usuário.
6. Conteúdo apresentado referencia uma `ContentRevision` específica.
7. Conteúdo publicado não muda semanticamente em lugar; cria nova revision.
8. `ReviewEvent` não é atualizado retroativamente.
9. `SessionItem` concluído não pode gerar duplicidade de progresso após retry.
10. Lesson só desbloqueia quando regras de pré-requisito forem atendidas ou explicitamente dispensadas por entry point.
11. Dispensa por placement não cria mastery, completion ou review fictícios.
12. AI failure nunca deve marcar resposta como correta por default.
13. Timezone influencia “dia de estudo”, mas timestamps persistidos permanecem UTC.
14. Exclusão de conta deve respeitar política de retenção definida.
15. Onboarding reentrante deve preservar unicidade de `LanguageProfile`/`Enrollment` pretendidos.
16. `startingLevel`/`entryPointLevel` manual não preenche `currentEstimatedLevel` e não produz evidência pedagógica.
17. Uma `StudySession` diária é única por `Enrollment + localStudyDate` na V1.
18. Uma lesson iniciada é retomada apenas contra a mesma `schemaVersion/revision` persistida.
19. Abrir o último bloco não conclui a lesson; completion exige transição explícita.
20. Navegação stale/duplicada não pode saltar mais de um bloco.
21. `sessionId`, `itemId` e `lessonId` do browser não substituem ownership server-side por Enrollment.

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

A persistência atual da jornada e da primeira vertical de estudo é:

```text
users
  └─ learner_profiles
  └─ language_profiles
       └─ enrollments
            ├─ lesson_progress
            └─ study_sessions
                 └─ session_items
```

A migration `0002_learner_journey` cria profiles/enrollment. A `0003_study_sessions` adiciona `lesson_progress`, `study_sessions` e `session_items`, com FKs, checks e constraints de unicidade para proteger ownership, data local, revision, estado, ordem e idempotência.

Course/Level/Unit/Lesson continuam como conteúdo versionado no Git e não são duplicados como tabelas de catálogo nesta foundation. Attempts, ReviewEvent, MemoryItem, MasteryState e demais estruturas pedagógicas continuam pertencendo às issues específicas.

## Practice, review e mastery (#21–#24)

- `ActivityAttempt`: fato imutável de uma resposta avaliada contra uma revision específica;
- `MemoryItem` + `ReviewEvent`: estado corrente e histórico do agendamento de revisão;
- `ConceptEvidence`: fato pedagógico derivado de Attempt/Review;
- `MasteryState`: projeção versionada/recomputável do conjunto de evidências.

`ActivityProgress` é projeção operacional, não fonte de verdade pedagógica. `LessonProgress` continua representando navegação/conclusão de lesson e não é sinônimo de mastery. A idempotência usa `operationKey` por Enrollment; operação nova respeita `maxAttempts`, enquanto retry devolve o fato já persistido.
