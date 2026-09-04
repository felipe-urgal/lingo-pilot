# Daily Session Planner v1

Este documento descreve o contrato do planner diário introduzido pela issue #25. O planner é determinístico, auditável e não depende de IA.

## Objetivo

O aluno deve abrir `Hoje` e receber uma sessão limitada pela meta diária sem precisar escolher manualmente entre retomar uma aula, revisar conteúdo vencido ou iniciar conteúdo novo.

O planner recebe fatos já validados por outras fronteiras:

- progresso e elegibilidade do currículo;
- `MemoryItem` vencido da fila de revisão;
- `MasteryState` usado para identificar conceitos fracos;
- meta diária do `LearnerProfile`;
- modalidades atualmente executáveis pelo produto;
- clock explícito.

Ele não cria mastery, attempt, review ou completion fictício. Também não chama provider de IA.

## Versão

```text
plannerVersion = daily-session-v1
```

A versão é persistida no `StudySession`. Mudanças futuras de política que alterem seleção/prioridade devem usar uma nova versão ou uma estratégia explícita de compatibilidade.

## Snapshot persistido

Uma sessão diária persiste um array ordenado de `SessionItem` dentro da mesma transação que cria a `StudySession`.

Tipos suportados no V1:

```text
lesson
review
```

Cada item preserva:

- `position`;
- `kind`;
- `resourceId`;
- `schemaVersion + revision`;
- `estimatedMinutes`;
- `reasonCode`;
- `eligibilityReason`;
- estado de execução.

Para `lesson`, `resourceId` é o ID da lesson publicada. Para `review`, `resourceId` é o ID do `MemoryItem`, enquanto a revision persistida corresponde à Activity fonte validada no momento do planejamento.

Dois requests concorrentes para o mesmo `Enrollment + localStudyDate` convergem para a sessão vencedora pela constraint já existente. O plano não é recalculado silenciosamente depois que a sessão foi persistida.

## Prioridade V1

A seleção é feita nesta ordem:

1. lesson já `in_progress`;
2. reviews vencidos há pelo menos 24 horas;
3. reviews vencidos ligados a weak concepts;
4. próxima lesson nova elegível;
5. demais reviews vencidos que ainda couberem no orçamento.

Tie-breakers são estáveis:

- lessons: ordem curricular e depois ID;
- reviews: `dueAt` e depois ID.

Conteúdo locked nunca entra nos candidatos: a elegibilidade é calculada antes do planner.

## Reason codes

| Reason code | Significado |
|---|---|
| `RESUME_IN_PROGRESS` | Retomar uma lesson já iniciada |
| `OVERDUE_REVIEW` | Recuperar um MemoryItem vencido |
| `WEAK_CONCEPT` | Recuperar um MemoryItem vencido cujo conceito está fraco |
| `NEW_ELIGIBLE_LESSON` | Iniciar a próxima lesson publicada e elegível |

`review` usa `eligibilityReason=not-applicable`; lessons preservam `progress-satisfied`, `placement-waived` ou `resume-in-progress`.

## Orçamento de tempo

Parâmetros explícitos do V1:

```text
reviewEstimatedMinutes = 2
normalReviewBudget = 40% da meta diária
extremeReviewDebt = dívida estimada >= 2x a meta diária
heavilyOverdue = atraso >= 24h
```

O planner nunca adiciona um item se ele fizer o total estimado ultrapassar a meta diária normalizada. A meta é normalizada para pelo menos o custo de uma review.

Em dívida normal, reviews podem consumir até 40% da meta, preservando espaço para conteúdo novo quando houver lesson elegível.

Em dívida extrema, o orçamento de review pode ocupar toda a meta e conteúdo novo é suspenso. Isso limita a sessão ao orçamento diário em vez de transformar uma fila grande em sessão infinita.

Uma lesson em andamento continua tendo precedência sobre a dívida: retomar trabalho persistido é prioridade maior do que replanejar o aluno para outro fluxo.

## Modalidades

O planner só seleciona reviews cuja Activity fonte pertença a uma modalidade atualmente executável. No recorte atual, o runtime habilita:

```text
reading
writing
mixed
```

`listening` e `speaking` entram quando suas fundações estiverem disponíveis. Itens de modalidade indisponível são ignorados pela seleção e contabilizados no diagnóstico.

Skill balance histórico continua sem efeito prático enquanto o produto não possuir múltiplas modalidades completas e histórico representativo. Ele deve ser adicionado por evolução versionada, não por heurística silenciosa.

## Weak concepts

O planner não gera microprática sintética para um conceito fraco. A prioridade `WEAK_CONCEPT` é aplicada somente quando existe um `MemoryItem` real, vencido e ligado ao conceito.

Isso mantém uma regra importante do produto: placement ou estimativa de domínio não fabricam evidência pedagógica.

## Execução de review planejada

A página de revisão resolve server-side se o `MemoryItem` atual pertence a um `SessionItem` planejado da sessão diária.

Quando pertence, o submit valida simultaneamente:

- enrollment autenticado;
- `sessionItemId`;
- `kind=review`;
- `resourceId=memoryItemId`;
- sessão ainda executável.

A gravação de `ReviewEvent`, atualização de `MemoryItem`, `ConceptEvidence`, `MasteryState`, completion do `SessionItem` e eventual completion da `StudySession` acontecem na mesma transação.

Revisões avulsas continuam válidas sem `sessionItemId`.

O hardening completo de execução — múltiplas abas, mudança de dia, stale session, retries de rede e resume multi-item — permanece na #26.

## Observabilidade

O use case de Today emite:

- `study.planner.duration` em milissegundos;
- `study.planner.review_debt`;
- `study.planner.new_content_suspended`;
- `study.planner.reason_code` com atributo `reasonCode`.

Nenhuma resposta textual do aluno é adicionada à telemetria.

## Testes

A cobertura obrigatória inclui:

- primeiro dia sem histórico;
- centenas de reviews vencidos;
- resume de lesson ativa;
- limite de timezone por `localStudyDate`;
- ausência de lesson elegível com review disponível;
- weak concept;
- modalidade indisponível;
- tie-breaker determinístico;
- snapshot determinístico;
- geração concorrente da sessão diária;
- persistência ordenada multi-item;
- conclusão transacional de review planejada.

## Limites da #25

A #25 entrega decisão e snapshot da sessão, além do mínimo de execução necessário para não deixar reviews planejadas órfãs.

Permanecem na #26:

- regras completas de avanço entre itens;
- duas abas/dispositivos;
- retry/recovery UX em rede instável;
- stale session;
- mudança de data/timezone durante uma sessão;
- summary final e hardening de completion.

A página completa de progresso/histórico continua na #27.
