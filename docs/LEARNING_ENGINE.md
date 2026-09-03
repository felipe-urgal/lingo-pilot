# Learning Engine — LingoPilot

## 1. Objetivo

O Learning Engine decide **o que estudar, quando revisar, quando avançar e onde reforçar**. Ele deve ser determinístico, testável e auditável. IA pode gerar variações de prática, mas não é responsável pela regra central de progressão.

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

### Baseline executável das #18–#20

A primeira vertical implementa somente a parte necessária para ir de matrícula até uma lesson estruturada:

```text
Enrollment
   ↓
Curriculum Catalog + Eligibility
   ↓
Today planner v1
   ↓
StudySession + SessionItem
   ↓
Lesson Player
   ↓
LessonProgress
```

Ainda não existem neste recorte Review Scheduler, Mastery Model, Attempts, SRS ou planner completo. Esses componentes continuam nas issues próprias; o código atual não fabrica evidência para preencher essas lacunas.

## 3. Daily Session Planner

### Entradas-alvo

- meta diária em minutos;
- timezone e data local;
- conteúdo desbloqueado;
- lessons em andamento;
- reviews vencidos/próximos;
- mastery recente;
- erros recorrentes;
- histórico das últimas sessões;
- disponibilidade das modalidades;
- preferências/acessibilidade relevantes.

### Saída

`StudySession` com lista ordenada de `SessionItem` e metadata de seleção.

### Planner V1 executável

O recorte da #19 usa `plannerVersion=today-shell-v1`. Ele deliberadamente não implementa a prioridade completa abaixo. Para a primeira vertical ele faz apenas:

1. calcular `localStudyDate` no timezone do aluno;
2. reler a sessão já persistida para `Enrollment + localStudyDate`, se existir;
3. caso não exista, priorizar uma lesson `in_progress`;
4. senão selecionar a primeira lesson `available` do catálogo validado;
5. persistir a sessão e o item com reason/revision antes de apresentar o CTA.

A constraint de unicidade no banco garante que requests concorrentes para a mesma data local convergem para a mesma `StudySession`.

### Ordem de prioridade alvo da #25

1. recuperar sessão em andamento;
2. reviews muito vencidos;
3. reforço de conceito frágil;
4. conteúdo novo elegível;
5. prática intercalada;
6. skill practice necessária;
7. reviews ainda dentro da janela, se houver orçamento.

A prioridade completa será calibrada com dados e deve permanecer função versionada/testável.

## 4. Orçamento de tempo

O planner completo não deve preencher indefinidamente uma sessão.

Exemplo de meta de 30 minutos:

```text
5–10 min  reviews
10–15 min conteúdo novo + prática
5–10 min  skill/retrieval
```

Regras-alvo:

- backlog de review não deve consumir automaticamente 100% da sessão por vários dias;
- reviews críticos têm prioridade, mas o sistema aplica limite de carga;
- conteúdo novo pode ser suspenso quando a dívida de revisão exceder um threshold;
- duração é estimativa, não promessa exata.

O `today-shell-v1` ainda usa apenas `estimatedMinutes` da lesson selecionada; não distribui orçamento entre categorias.

## 5. Elegibilidade curricular

A #18 introduz `evaluateCurriculum`, uma regra pura/testável sobre catálogo, Enrollment e `LessonProgress`.

Uma lesson pode ser elegível quando:

- enrollment está ativo;
- o conteúdo está `published`;
- pré-requisitos explícitos foram concluídos;
- ou pré-requisitos anteriores ao `entryPointLevel` foram dispensados por placement;
- não existe `LessonProgress in_progress` apontando para revision incompatível.

Resultados de disponibilidade iniciais:

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

### Algoritmo

A implementação inicial deve usar um algoritmo de repetição espaçada validado, preferencialmente FSRS, encapsulado atrás de interface:

```ts
interface ReviewScheduler {
  grade(input: ReviewGradeInput): ReviewScheduleResult
  preview(input: ReviewPreviewInput): ReviewScheduleResult[]
}
```

Persistir versão/parâmetros do algoritmo relevantes para reproduzir comportamento.

### Ratings

Não expor necessariamente os nomes internos do algoritmo ao iniciante. A UI pode usar respostas implícitas e transformar resultado em grade.

Exemplos de sinais:

- correto sem pista;
- correto após pista;
- incorreto;
- tempo anormalmente alto;
- reconhecimento versus produção.

A conversão para grade deve ser documentada e testada.

## 8. Mastery

Mastery não deve ser atualizado por uma única resposta de forma binária.

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

### Estado

A primeira implementação pode usar score normalizado e confidence, desde que:

- fórmula seja explícita;
- algoritmo tenha versão;
- testes cubram sequências de evidência;
- alterações futuras possam recalcular ou migrar significado.

## 9. Interleaving

O planner deve evitar blocos longos com dezenas de questões idênticas quando o objetivo for retenção.

Princípios:

- prática inicial pode ser bloqueada para entender a regra;
- revisão posterior deve misturar conceitos;
- itens parecidos podem ser contrastados intencionalmente;
- dificuldade deve crescer gradualmente.

## 10. Retrieval practice

Conteúdo novo deve gerar recuperação futura sem exposição da resposta.

Exemplo:

```text
Lesson: I am / You are
  ↓
Guided exercise
  ↓
Same-day quick retrieval
  ↓
SRS review
  ↓
Mixed sentence production
  ↓
Speaking or writing context
```

## 11. Error reinforcement

O sistema deve registrar `ErrorCategory` e conceito quando possível.

Erros recorrentes podem gerar:

- review adicional;
- explicação curta;
- contraste com forma correta;
- prática de discriminação;
- produção em novo contexto.

Evitar punir o aluno com dezenas de repetições imediatas do mesmo item.

## 12. Modalidades

Modalidades iniciais:

- recognition;
- reading;
- listening;
- writing;
- speaking.

O mesmo conceito pode ter evidências diferentes por modalidade. Mastery global não deve esconder completamente fraqueza de speaking/listening.

## 13. Sessão persistida

A foundation atual persiste:

- `plannerVersion`;
- `localStudyDate`;
- item selecionado e ordem;
- `reasonCode`;
- `eligibilityReason`;
- estimativa de duração;
- `schemaVersion + revision` do conteúdo;
- status/timestamps da sessão e item.

Isso permite responder “por que esse item apareceu?” e impede reconstruir silenciosamente uma sessão com conteúdo/regras que já mudaram.

Inputs resumidos mais ricos do planner entram quando #25 realmente usar reviews, mastery, dívida e preferências na seleção.

## 14. Reason codes

Implementados na primeira vertical:

```text
RESUME_IN_PROGRESS
NEW_ELIGIBLE_LESSON
```

Reservados para evolução quando existirem os respectivos inputs:

```text
OVERDUE_REVIEW
WEAK_CONCEPT
SKILL_BALANCE
RECENT_ERROR_REINFORCEMENT
UNIT_CHECKPOINT
```

Reason codes devem ser estáveis para analytics.

## 15. Casos de borda

A foundation das #18–#20 já cobre ou trata explicitamente:

- primeiro dia sem histórico;
- zero conteúdo novo elegível;
- sessão existente na mesma data local;
- dois dispositivos abrindo Today simultaneamente;
- timezone boundaries;
- lesson revisionada/indisponível enquanto em andamento;
- refresh no meio da lesson;
- refresh no último bloco sem completion;
- POST duplicado/stale de navegação;
- acesso a session/item de outro Enrollment.

Continuam para o planner/engines seguintes:

- centenas de reviews atrasados;
- sessão abandonada ontem e policy de retomada cross-day;
- usuário completando sessão após meia-noite local;
- modalidades indisponíveis;
- IA indisponível;
- balancing entre review/conteúdo novo/skills.

## 16. Concorrência

Gerar `StudySession` para uma mesma data local é idempotente por constraint `Enrollment + localStudyDate` e criação transacional.

Start e completion são protegidos por ownership, estado e revision. Navegação de bloco exige `expectedBlockIndex`, evitando que requests duplicados avancem mais de uma posição.

Futuros SessionItems/Attempts devem preservar o mesmo princípio: retry não pode produzir progresso pedagógico duplicado.

## 17. Testes essenciais

Cobertos nesta foundation:

- unlock por progresso real;
- placement A0/A1/A2 e conteúdo waived;
- lesson locked não inicia por ID manual;
- revision mismatch;
- timezone boundary;
- geração concorrente de sessão;
- isolamento de progresso entre enrollments;
- resume de lesson;
- completion explícita;
- submit duplicado de navegação;
- renderer/fallback dos ContentBlocks;
- E2E onboarding → Today → Lesson Player → completion.

Continuam essenciais conforme os próximos engines entrarem:

- prioridade de review vencido;
- suspensão de conteúdo novo sob dívida extrema;
- limite de minutos;
- equilíbrio de modalidades;
- mesma entrada + mesma versão → mesmo plano completo;
- sequences de mastery;
- sequences do SRS;
- comportamento após erro recorrente.

## 18. Evolução

Qualquer mudança de fórmula que altere decisões reais precisa:

1. nova versão;
2. testes comparativos;
3. análise de migration/recalculation;
4. registro em ADR quando alterar significado de progresso.

O mesmo vale para semântica de eligibility, plannerVersion e migration de `LessonProgress` entre revisions publicadas.
