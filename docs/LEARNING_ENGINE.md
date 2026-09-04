# Learning Engine — LingoPilot

## 1. Objetivo

O Learning Engine decide **o que estudar, quando revisar, quando avançar e onde reforçar**. Ele deve ser determinístico, testável e auditável. IA pode gerar variações de prática no futuro, mas não é responsável pela regra central de progressão.

## 2. Componentes

```text
Curriculum Eligibility
        ↓
Review Scheduler ───────┐
        ↓               │
Mastery Model ──────────┤
        ↓               │
Daily Session Planner ←─┘
        ↓
Session Plan
        ↓
Attempts / Review Events
        ↓
Evidence → Mastery / SRS updates
```

### Estado executável em 2026-09-04

As #18–#24 estão em `main` e formam a baseline determinística do Study Engine:

```text
Enrollment
   ↓
Curriculum Catalog + Eligibility
   ↓
Lesson / Activity
   ↓
Attempt → MemoryItem / ReviewEvent
   ↓
ConceptEvidence → MasteryState
```

A #25 está em review no PR #87 e adiciona o `daily-session-v1`, conectando currículo, review queue e mastery ao snapshot diário persistido. A política detalhada e versionada está em `docs/DAILY_SESSION_PLANNER.md`.

## 3. Daily Session Planner

### Entradas

O V1 usa:

- meta diária em minutos;
- clock e data local derivada do timezone do aluno;
- lessons publicadas/elegíveis;
- lesson em andamento;
- reviews vencidos;
- weak concepts derivados de mastery real;
- disponibilidade das modalidades executáveis.

Histórico de modalidades/skill balance só deve alterar a decisão quando existirem modalidades completas e evidência representativa. Não adicionar heurística decorativa apenas para preencher esse campo-alvo.

### Saída

`StudySession` com lista ordenada de `SessionItem` e metadata de seleção:

```text
plannerVersion = daily-session-v1
kind           = lesson | review
reasonCode     = motivo estável da seleção
revision       = schemaVersion + revision do conteúdo
```

O snapshot é persistido antes do CTA e não é replanejado silenciosamente no refresh.

### Ordem de prioridade V1

1. recuperar lesson em andamento;
2. reviews vencidos há pelo menos 24 horas;
3. reviews vencidos de weak concepts;
4. conteúdo novo elegível;
5. demais reviews vencidos que ainda couberem no orçamento.

Tie-breakers:

- lessons: ordem curricular, depois ID;
- reviews: `dueAt`, depois ID.

Conteúdo locked é removido pela elegibilidade antes de chegar ao planner.

## 4. Orçamento de tempo

O planner não deve preencher indefinidamente uma sessão.

Parâmetros do `daily-session-v1`:

```text
reviewEstimatedMinutes = 2
normalReviewBudget      = 40% da meta diária
extremeReviewDebt       = dívida estimada >= 2x a meta diária
heavilyOverdue          = atraso >= 24h
```

Regras:

- nenhum item é adicionado se fizer o total estimado ultrapassar a meta diária normalizada;
- em dívida normal, reviews usam no máximo 40% da meta;
- conteúdo novo pode ser suspenso em dívida extrema;
- em dívida extrema, reviews podem usar o budget diário inteiro, mas nunca transformar a fila em sessão infinita;
- uma lesson já em andamento continua tendo prioridade sobre replanejamento;
- duração continua sendo estimativa, não promessa exata.

A meta é normalizada para pelo menos o custo de uma review.

## 5. Elegibilidade curricular

A #18 introduz `evaluateCurriculum`, uma regra pura/testável sobre catálogo, Enrollment e `LessonProgress`.

Uma lesson pode ser elegível quando:

- enrollment está ativo;
- o conteúdo está `published`;
- pré-requisitos explícitos foram concluídos;
- ou pré-requisitos anteriores ao `entryPointLevel` foram dispensados por placement;
- não existe `LessonProgress in_progress` apontando para revision incompatível.

Resultados de disponibilidade:

```text
locked
available
in_progress
completed
waived
```

Motivos auditáveis:

```text
progress-satisfied
placement-waived
prerequisite-missing
content-unavailable
enrollment-inactive
resume-in-progress
already-completed
revision-mismatch
```

Não inferir pré-requisito apenas por posição visual. `placement-waived` permite navegação para o nível escolhido sem criar completion, Attempt, ReviewEvent, ConceptEvidence ou MasteryState fictícios.

`canStartLesson` é reavaliado no servidor antes do start. Saber ou alterar um `lessonId` no browser não desbloqueia conteúdo locked.

## 6. Progressão e Lesson Player

Conclusão de lesson e desbloqueio são conceitos diferentes.

O Lesson Player da #20:

- carrega somente lesson `published` do catálogo já validado;
- exige que `StudySession`, `SessionItem` e Enrollment pertençam à jornada autenticada;
- exige `schemaVersion + revision` iguais às planejadas;
- cria/retoma `LessonProgress` somente após start válido;
- persiste `currentBlockIndex`;
- permite voltar/avançar um passo por transição;
- exige ação explícita `Concluir aula` no último bloco.

Abrir ou recarregar o último bloco não conclui nada. Se a revision mudar enquanto a lesson está em andamento, a retomada é bloqueada e o progresso anterior permanece preservado para uma decisão explícita de migração.

Submit de navegação usa compare-and-set sobre `expectedBlockIndex`; um request duplicado/stale não pode avançar duas vezes.

A V1 deve manter progressão compreensível e evitar algoritmos opacos para liberar conteúdo.

## 7. Repetição espaçada

### Separação conceitual

SRS agenda **MemoryItems**. Mastery estima domínio de **Concepts**. São mecanismos relacionados, mas não idênticos.

### Algoritmo atual

O `review-scheduler-v1`, entregue pela #23, é determinístico, versionado e encapsulado atrás de `ReviewScheduler`. Ele é uma baseline explícita, **não FSRS**.

A fila de review é ordenada por:

```text
dueAt, id
```

Review concorrente usa `expectedReviewCount` como compare-and-set e retry com a mesma `operationKey` retorna o evento original.

### Ratings

A UI não precisa expor nomes internos do algoritmo. Resultado/hints são convertidos server-side para grade.

Sinais relevantes:

- correto sem pista;
- correto após pista;
- incorreto;
- reconhecimento versus produção;
- delayed retrieval.

A conversão para grade é documentada/testada no practice engine e na ADR 0005.

## 8. Mastery

Mastery não é atualizado por uma única resposta de forma binária.

### Evidências

Maior peso:

- produção sem pista;
- acerto em contexto novo;
- acerto após intervalo;
- desempenho em mais de uma modalidade.

Menor peso:

- múltipla escolha com alternativas óbvias;
- repetição imediata;
- resposta com hint.

Sinais negativos:

- erro recente;
- repetição do mesmo erro;
- incapacidade de recuperar após intervalo;
- erro em uso independente.

### Estado atual

`mastery-v1` mantém score e confidence separados e recomputa a projeção a partir de `ConceptEvidence` imutável. A fórmula é explícita/versionada e delayed retrieval pesa mais do que prática guiada.

Lesson completion, mastery e SRS permanecem estados distintos.

## 9. Interleaving

O planner deve evitar blocos longos com dezenas de questões idênticas quando o objetivo for retenção.

Princípios:

- prática inicial pode ser bloqueada para entender a regra;
- revisão posterior deve misturar conceitos;
- itens parecidos podem ser contrastados intencionalmente;
- dificuldade deve crescer gradualmente.

O `daily-session-v1` já intercala categorias pela prioridade do plano, mas não cria microprática sintética para weak concepts.

## 10. Retrieval practice

Conteúdo novo deve gerar recuperação futura sem exposição da resposta.

Exemplo:

```text
Lesson: I am / You are
  ↓
Guided exercise
  ↓
MemoryItem
  ↓
SRS review
  ↓
Mixed sentence production futura
  ↓
Speaking or writing context futura
```

## 11. Error reinforcement

O sistema deve registrar categoria/conceito quando possível.

Erros recorrentes podem futuramente gerar:

- review adicional;
- explicação curta;
- contraste com forma correta;
- prática de discriminação;
- produção em novo contexto.

Evitar punir o aluno com dezenas de repetições imediatas do mesmo item. A #25 não fabrica microprática apenas porque um conceito está fraco; `WEAK_CONCEPT` prioriza somente `MemoryItem` real e vencido.

## 12. Modalidades

Modalidades do modelo:

- recognition;
- reading;
- listening;
- writing;
- speaking;
- mixed quando a Activity representa combinação suportada.

O mesmo conceito pode ter evidências diferentes por modalidade. Mastery global não deve esconder completamente fraqueza de speaking/listening.

No runtime atual do planner, as modalidades executáveis são `reading`, `writing` e `mixed`. `listening` e `speaking` entram quando suas foundations existirem. Reviews de modalidade indisponível não entram no snapshot e são contabilizadas no diagnóstico.

## 13. Sessão persistida

O snapshot diário persiste:

- `plannerVersion`;
- `localStudyDate`;
- lista ordenada de itens;
- `kind=lesson|review`;
- `reasonCode`;
- `eligibilityReason` quando aplicável;
- estimativa de duração;
- `schemaVersion + revision` do conteúdo;
- status/timestamps da sessão e item.

Para lesson, `resourceId` é o ID da lesson. Para review, `resourceId` é o ID do `MemoryItem` e a revision preservada corresponde à Activity fonte.

Isso permite responder “por que esse item apareceu?” e impede reconstruir silenciosamente uma sessão com conteúdo/regras que já mudaram.

Geração concorrente continua idempotente por `Enrollment + localStudyDate`: o primeiro snapshot persistido vence; o request concorrente relê exatamente a sessão vencedora.

## 14. Reason codes

Implementados no `daily-session-v1`:

```text
RESUME_IN_PROGRESS
OVERDUE_REVIEW
WEAK_CONCEPT
NEW_ELIGIBLE_LESSON
```

Possíveis evoluções futuras, somente quando existirem inputs/contratos correspondentes:

```text
SKILL_BALANCE
RECENT_ERROR_REINFORCEMENT
UNIT_CHECKPOINT
```

Reason codes devem permanecer estáveis para auditoria e analytics. Alterar semântica requer versionamento.

## 15. Casos de borda

Cobertos pelo Study Engine atual e pela #25:

- primeiro dia sem histórico;
- zero conteúdo novo elegível com reviews disponíveis;
- sessão existente na mesma data local;
- dois requests gerando Today simultaneamente;
- timezone boundaries;
- centenas de reviews atrasados limitados pelo budget;
- dívida extrema suspendendo conteúdo novo;
- weak concept com MemoryItem real;
- modalidade indisponível;
- lesson revisionada/indisponível enquanto em andamento;
- refresh no meio da lesson;
- refresh no último bloco sem completion;
- POST duplicado/stale de navegação;
- acesso a session/item de outro Enrollment;
- review planejada vinculada ao Enrollment e concluída transacionalmente.

Continuam para #26 e engines seguintes:

- regra completa para sessão iniciada antes e concluída depois da meia-noite local;
- stale session cross-day;
- duas abas/dispositivos executando itens simultaneamente;
- retry/recovery UX de rede instável;
- avanço/summary final multi-item;
- IA indisponível quando IA fizer parte de uma atividade;
- skill balance histórico entre modalidades completas.

## 16. Concorrência

Gerar `StudySession` para uma mesma data local é idempotente por constraint `Enrollment + localStudyDate` e criação transacional do snapshot inteiro.

Start e completion de lesson são protegidos por ownership, estado, `kind=lesson` e revision. Navegação de bloco exige `expectedBlockIndex`, evitando que requests duplicados avancem mais de uma posição.

Attempt é idempotente por `operationKey` e serializa o limite por `Enrollment + Activity`. Review usa `operationKey` + compare-and-set em `reviewCount`.

Quando a review veio do plano diário, o mesmo transaction boundary grava `ReviewEvent`, atualiza SRS/evidence/mastery e conclui `SessionItem/StudySession`. Não existe estado em que o review foi aceito mas o item diário ficou parcialmente concluído por uma segunda gravação independente.

## 17. Testes essenciais

Cobertos:

- unlock por progresso real;
- placement A0/A1/A2 e conteúdo waived;
- lesson locked não inicia por ID manual;
- revision mismatch;
- timezone boundary;
- geração concorrente de sessão;
- snapshot ordenado multi-item;
- isolamento de progresso entre enrollments;
- resume de lesson;
- completion explícita;
- submit duplicado de navegação;
- renderer/fallback dos ContentBlocks;
- evaluator determinístico das Activities;
- Attempt/Review idempotentes;
- sequências de SRS/mastery;
- primeiro dia do planner;
- centenas de reviews vencidos;
- prioridade de review muito vencido;
- weak concept;
- ausência de lesson elegível;
- modalidade indisponível;
- limite de minutos e suspensão de conteúdo novo;
- mesma entrada + mesma versão → mesmo plano;
- completion transacional de review planejada.

O E2E existente cobre onboarding → Today → Lesson Player → completion. O hardening E2E de interrupção/resume multi-item pertence à #26.

## 18. Evolução

Qualquer mudança de fórmula/política que altere decisões reais precisa:

1. nova versão ou estratégia explícita de compatibilidade;
2. testes comparativos;
3. análise de migration/recalculation;
4. registro em ADR quando alterar significado de progresso.

O mesmo vale para semântica de eligibility, plannerVersion, scheduler/mastery e migration de `LessonProgress` entre revisions publicadas.

## 19. Practice loop executável (#21–#24)

O PR #86, mergeado em 2026-09-03, implementou:

```text
Activity determinística
   ↓
ActivityAttempt imutável + ActivityProgress
   ↓
ConceptEvidence → MasteryState (mastery-v1)
   ↓
MemoryItem → due queue → ReviewEvent
```

`evaluateActivity` é puro e cobre single/multiple choice, fill blank, word order, matching, short answer e translation. A UI é apenas renderer/coleta de resposta; `correct`, score e grade são derivados no servidor. Cada Activity possui `maxAttempts`, aplicado transacionalmente sob lock por Enrollment + Activity para que submits concorrentes não ultrapassem a política.

O `review-scheduler-v1` é determinístico e encapsulado atrás de `ReviewScheduler`. Ele é uma baseline explícita e auditável, **não FSRS**; parâmetros/versão ficam persistidos e a ADR 0005 documenta a decisão. A fila usa `dueAt, id` como ordem estável, limite máximo e paginação por offset.

`ReviewEvent`, `ActivityAttempt` e `ConceptEvidence` são históricos imutáveis. Retry com a mesma `operationKey` retorna o evento original. `ReviewEvent → MemoryItem` usa `ON DELETE RESTRICT` para não apagar histórico de revisão por cascata.

`mastery-v1` recomputa score/confidence a partir de evidências reais; delayed retrieval pesa mais que prática guiada e erro recente reduz o score. Mastery continua separado de lesson completion e do estado do SRS.

## 20. Daily planner executável (#25)

O PR #87 introduz o `daily-session-v1` como função pura em `packages/learning` e integra os inputs reais no use case de Today.

A política completa, parâmetros, reason codes, snapshot, observabilidade, testes e limites de escopo estão em [`DAILY_SESSION_PLANNER.md`](DAILY_SESSION_PLANNER.md).

A #25 termina na decisão + snapshot + execução mínima de review planejada. A #26 continua sendo a dona do hardening completo de execução/resume/idempotência da sessão.
