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

A gravação de `ReviewEvent`, atualização de `MemoryItem`, `ConceptEvidence`, `MasteryState`, completion do `SessionItem` e eventual completion da `StudySession` acontecem na mesma transação do learning loop. Depois disso, o hardening de execução reconcilia a sessão para tratar `skipped` como terminal sem considerar o item como aprendizagem concluída.

Revisões avulsas continuam válidas sem `sessionItemId`.

## Hardening de execução — #26

A #26 mantém o snapshot persistido como autoridade e não cria uma segunda camada de estado.

### Recorte 1 — PR #91

1. **refresh/resume:** `StudySession`, `SessionItem` e `LessonProgress.currentBlockIndex` são relidos do banco; refresh não replana nem avança posição;
2. **submit repetido:** Attempt e Review continuam idempotentes por `operationKey`, e o formulário bloqueia um segundo submit enquanto a mesma operação está em voo;
3. **duas abas:** propostas concorrentes para o mesmo `Enrollment + localStudyDate` convergem para o snapshot vencedor; a aba perdedora recebe os IDs e itens realmente persistidos;
4. **falha de rede/retry:** o formulário preserva resposta e `operationKey` após falha transitória e reutiliza a mesma operação no retry.

O formulário continua sendo um `<form method="post">`: sem JavaScript, o fluxo nativo permanece funcional. Com JavaScript, o submit é progressivamente aprimorado para oferecer estado de envio e recuperação de rede sem alterar o contrato server-side.

### Recorte 2 — PR #92

#### Mudança de dia e timezone

Uma sessão `planned|in_progress` já persistida permanece autoritativa até se tornar terminal, mesmo se o clock local mudar de data ou se a timezone do learner mudar entre requests.

Regra V1:

```text
há sessão aberta persistida?
  sim -> retomar exatamente essa sessão e seu localStudyDate original
  não -> carregar/criar a sessão da data local atual
```

Portanto uma sessão iniciada antes da meia-noite pode terminar depois da meia-noite sem ganhar um segundo snapshot concorrente. A próxima data local só recebe um novo plano depois que a sessão anterior fica terminal. Não há expiração silenciosa por idade: uma sessão antiga continua recuperável, e conteúdo que deixou de ser executável segue a política de recovery abaixo.

#### Recovery de conteúdo stale/retired

`SessionItem.status` passa a aceitar:

```text
planned | in_progress | completed | skipped
```

`skipped` é terminal operacional, mas **não** significa conclusão pedagógica. Nenhum `Attempt`, `ReviewEvent`, `ConceptEvidence`, `MasteryState` ou `LessonProgress.completed` é criado ao ignorar um item.

A UI só oferece recovery quando o item planejado deixou de ser executável. O POST revalida ownership e classifica server-side:

- `content-unavailable`: lesson/activity/memory necessário não existe ou não está publicado/executável;
- `revision-conflict`: schema/revision atual não corresponde ao snapshot persistido;
- `review-no-longer-due`: o `MemoryItem` planejado continua válido, mas outra operação já moveu seu `dueAt` para o futuro.

Se o conteúdo ainda está válido e executável, o endpoint recusa o skip. Repetir o mesmo recovery de um item já `skipped` é idempotente.

#### Completion e summary

Um item é terminal quando está `completed` ou `skipped`. A sessão só fica `completed` quando não existe nenhum item `planned|in_progress` persistido.

O summary de Hoje deriva diretamente desses itens:

- conta aulas/reviews realmente `completed`;
- mostra separadamente a quantidade `skipped`;
- deixa explícito que `skipped` não contou como aprendizagem;
- preserva a data original quando a sessão atravessou o limite local de dia.

Não há XP, score ou métrica decorativa no summary.

## Observabilidade

O use case de Today emite:

- `study.planner.duration` em milissegundos;
- `study.planner.review_debt`;
- `study.planner.new_content_suspended`;
- `study.planner.reason_code` com atributo `reasonCode`;
- `study.session.resume` com `source=same-day|day-boundary` e as datas locais do snapshot/current request.

Recovery emite `study.session.failure_reason` com `reason` e `itemKind` somente na primeira transição para `skipped`.

Os endpoints de Attempt e Review registram `duplicate` no evento de conclusão, permitindo distinguir retries idempotentes de gravações novas sem registrar respostas textuais do aluno.

Nenhuma resposta textual, email, transcript ou áudio do aluno é adicionada à telemetria.

## Testes

A cobertura obrigatória inclui:

- primeiro dia sem histórico;
- centenas de reviews vencidos;
- resume de lesson ativa;
- refresh relendo a mesma sessão/item e o mesmo `currentBlockIndex` persistido;
- sessão aberta preservando `localStudyDate` ao atravessar um novo dia;
- ausência de lesson elegível com review disponível;
- weak concept;
- modalidade indisponível;
- tie-breaker determinístico;
- snapshot determinístico;
- geração concorrente da sessão diária;
- duas abas recebendo exatamente o snapshot vencedor persistido;
- persistência ordenada multi-item;
- conclusão transacional de review planejada;
- `skipped` idempotente e completion apenas após todos os itens ficarem terminais;
- bloqueio de submits simultâneos no cliente;
- retry após falha de rede preservando resposta e `operationKey`;
- E2E de interrupção: refresh no meio da lesson, logout/login, retorno por Hoje e retomada no mesmo bloco antes de concluir.

## Limites após a #26

Com os recortes dos PRs #91 e #92, a #26 fecha o contrato de execução/resume da Fase 1. Evoluções futuras de sessão devem preservar as invariantes acima ou versionar explicitamente o contrato.

A página completa de progresso/histórico continua na #27. PWA/offline queue e replay offline pertencem à #42 e devem reutilizar a idempotência estabelecida aqui em vez de criar semântica paralela.
