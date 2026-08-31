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

## 3. Daily Session Planner

### Entradas

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

### Ordem de prioridade inicial

1. recuperar sessão em andamento;
2. reviews muito vencidos;
3. reforço de conceito frágil;
4. conteúdo novo elegível;
5. prática intercalada;
6. skill practice necessária;
7. reviews ainda dentro da janela, se houver orçamento.

A prioridade exata será calibrada com dados, mas deve existir como função versionada e testável.

## 4. Orçamento de tempo

O planner não deve preencher indefinidamente uma sessão.

Exemplo de meta de 30 minutos:

```text
5–10 min  reviews
10–15 min conteúdo novo + prática
5–10 min  skill/retrieval
```

Regras:

- backlog de review não deve consumir automaticamente 100% da sessão por vários dias;
- reviews críticos têm prioridade, mas o sistema aplica limite de carga;
- conteúdo novo pode ser suspenso quando a dívida de revisão exceder um threshold;
- duração é estimativa, não promessa exata.

## 5. Elegibilidade curricular

Uma lesson pode ser elegível quando:

- enrollment ativo;
- pré-requisitos concluídos;
- conceitos-base com mastery mínimo quando a regra exigir;
- lesson anterior da sequência concluída, salvo branch curricular explícito;
- nenhum bloqueio editorial.

Não inferir pré-requisito apenas por posição visual; armazenar regra explícita quando necessária.

## 6. Progressão

Conclusão de lesson e desbloqueio são conceitos diferentes.

Uma lesson pode estar concluída, mas a próxima atividade de checkpoint pode exigir desempenho mínimo.

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

Ao criar a sessão, persistir:

- `plannerVersion`;
- inputs resumidos;
- itens selecionados;
- reason code por item;
- estimativa de duração;
- ordem inicial.

Isso permite responder “por que esse item apareceu?” sem tentar reconstruir decisão com dados já alterados.

## 14. Reason codes

Exemplos:

```text
RESUME_IN_PROGRESS
OVERDUE_REVIEW
WEAK_CONCEPT
NEW_ELIGIBLE_LESSON
SKILL_BALANCE
RECENT_ERROR_REINFORCEMENT
UNIT_CHECKPOINT
```

Reason codes devem ser estáveis para analytics.

## 15. Casos de borda

O planner precisa cobrir:

- primeiro dia sem histórico;
- zero conteúdo novo elegível;
- centenas de reviews atrasados;
- sessão abandonada ontem;
- timezone alterado;
- dois dispositivos abrindo Today simultaneamente;
- usuário completando sessão após meia-noite local;
- lesson retirada enquanto estava em andamento;
- conteúdo revisionado;
- modo speaking indisponível;
- IA indisponível.

## 16. Concorrência

Gerar `StudySession` para uma mesma data local deve ser idempotente conforme regra do produto.

Não criar duas sessões independentes por duplo clique/refresh.

Submit de SessionItem também deve ser idempotente.

## 17. Testes essenciais

- prioridade de review vencido;
- suspensão de conteúdo novo sob dívida extrema;
- retomada de session;
- desbloqueio de lesson;
- limite de minutos;
- equilíbrio de modalidades;
- mesma entrada + mesma versão → mesmo plano;
- timezone boundaries;
- idempotência;
- sequences de mastery;
- sequences do SRS;
- comportamento após erro recorrente.

## 18. Evolução

Qualquer mudança de fórmula que altere decisões reais precisa:

1. nova versão;
2. testes comparativos;
3. análise de migration/recalculation;
4. registro em ADR quando alterar significado de progresso.
