from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"anchor missing: {path}: {old[:60]}")
    file.write_text(content.replace(old, new, 1))


def append_once(path: str, marker: str, text: str) -> None:
    file = Path(path)
    content = file.read_text()
    if marker not in content:
        file.write_text(content.rstrip() + "\n\n" + text.strip() + "\n")


replace(
    "README.md",
    "A **Fase 1 — Study Engine** começou pela #17 com signup, `LearnerProfile`, `LanguageProfile`, `Enrollment` e onboarding A0/A1/A2. O PR das #18–#20 acrescenta a próxima vertical: catálogo curricular carregado de conteúdo versionado/validado, elegibilidade com placement waiver auditável, `StudySession` diária persistida, tela Hoje com ação clara e Lesson Player estruturado/retomável com completion explícita.",
    "A **Fase 1 — Study Engine** já cobre #17–#20 em `main`: signup/onboarding, catálogo/elegibilidade, `StudySession` diária, Today e Lesson Player retomável. O PR #86 adiciona a vertical #21–#24: Exercise Engine determinístico, Attempts transacionais/idempotentes, fila de revisão espaçada e evidência/mastery por conceito.",
)
replace(
    "README.md",
    "O conteúdo autorado deste recorte é deliberadamente um **bootstrap estrutural**: Course/Level/Unit A0/A1/A2 e uma lesson de orientação do produto em A0. A migração editorial das aulas reais A0→A2 continua separada. Exercise Engine (#21), SRS, mastery, planner completo (#25), conteúdo pedagógico real em escala e AI Tutor continuam fora deste PR.",
    "O conteúdo autorado continua deliberadamente pequeno: Course/Level/Unit A0/A1/A2, uma lesson de orientação A0 e uma Activity/Concept determinísticos para exercitar o loop de prática. A migração editorial das aulas reais A0→A2 continua separada. Planner completo (#25), hardening de sessão (#26), progresso completo (#27), conteúdo em escala e AI Tutor continuam fora deste PR.",
)
replace(
    "README.md",
    "- **Fase 1 — Study Engine:** onboarding, conteúdo A0–A2, Today, aulas, exercícios, SRS e progresso. **#17 entregue; #18–#20 cobertas por este PR. Após o merge, #21 é a próxima dependência direta do fluxo de estudo.**",
    "- **Fase 1 — Study Engine:** onboarding, conteúdo A0–A2, Today, aulas, exercícios, SRS e progresso. **#17–#20 entregues; #21–#24 em review no PR #86. Após esse merge, #25 é a próxima dependência direta do loop.**",
)
append_once(
    "README.md",
    "### Loop de prática executável",
    """### Loop de prática executável

No último passo de uma lesson, Activities determinísticas são avaliadas no servidor e registradas como `ActivityAttempt`. A mesma transação atualiza `ActivityProgress`, cria `ConceptEvidence`, inicializa `MemoryItem` e recalcula `MasteryState`. `operationKey` torna retries idempotentes; a política `maxAttempts` é aplicada de forma serializada por learner + Activity.

```text
Lesson Player
   ↓
Activity → Attempt
   ↓         ↓
feedback   ConceptEvidence → MasteryState
   ↓
MemoryItem → /app/review → ReviewEvent
```

A due queue é ordenada deterministicamente, limitada/paginável e o histórico de `ReviewEvent` não é apagado por remoção de `MemoryItem`. O scheduler V1 é versionado (`review-scheduler-v1`) e deliberadamente não é apresentado como FSRS; a decisão está em `docs/ADR/0005-practice-scheduler-and-mastery-v1.md`.""",
)

append_once(
    "docs/LEARNING_ENGINE.md",
    "## 19. Practice loop executável (#21–#24)",
    """## 19. Practice loop executável (#21–#24)

O PR #86 implementa a parte antes descrita como futura:

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

`ReviewEvent`, `ActivityAttempt` e `ConceptEvidence` são históricos imutáveis. Retry com a mesma `operationKey` retorna o evento original. Review concorrente usa `expectedReviewCount` como compare-and-set. `ReviewEvent → MemoryItem` usa `ON DELETE RESTRICT` para não apagar histórico de revisão por cascata.

`mastery-v1` recomputa score/confidence a partir de evidências reais; delayed retrieval pesa mais que prática guiada e erro recente reduz o score. Mastery continua separado de lesson completion e do estado do SRS.""",
)

append_once(
    "docs/DATABASE.md",
    "## Practice learning loop — migration 0004",
    """## Practice learning loop — migration 0004

A migration `0004_practice_learning_loop.sql` adiciona `activity_attempts`, `activity_progress`, `memory_items`, `review_events`, `concept_evidence` e `mastery_states`.

Attempt é composto numa única transação com progress, MemoryItem inicial, evidence e mastery. A política de retry é serializada por Enrollment + Activity antes da contagem, evitando que requests concorrentes ultrapassem `maxAttempts`. Review usa CAS em `review_count`; falha ou submit stale não produz evento/evidência parcial.

`review_events.memory_item_id` usa `ON DELETE RESTRICT`, pois remover estado corrente não pode apagar histórico pedagógico. As tabelas ligadas diretamente a Enrollment seguem o lifecycle de exclusão da jornada; export/retention deve tratar Attempts/Reviews/Evidence como dados do learner.""",
)

append_once(
    "docs/DOMAIN_MODEL.md",
    "## Practice, review e mastery (#21–#24)",
    """## Practice, review e mastery (#21–#24)

- `ActivityAttempt`: fato imutável de uma resposta avaliada contra uma revision específica;
- `MemoryItem` + `ReviewEvent`: estado corrente e histórico do agendamento de revisão;
- `ConceptEvidence`: fato pedagógico derivado de Attempt/Review;
- `MasteryState`: projeção versionada/recomputável do conjunto de evidências.

`ActivityProgress` é projeção operacional, não fonte de verdade pedagógica. `LessonProgress` continua representando navegação/conclusão de lesson e não é sinônimo de mastery. A idempotência usa `operationKey` por Enrollment; operação nova respeita `maxAttempts`, enquanto retry devolve o fato já persistido.""",
)

append_once(
    "docs/UX_AND_DESIGN.md",
    "## Prática determinística e revisão rápida",
    """## Prática determinística e revisão rápida

No último passo da lesson, a prática aparece antes da ação de conclusão. Choice usa inputs nativos; word order e matching usam seletores focáveis como alternativa keyboard-first a drag interactions. Fill blank/short answer/translation usam input textual com label explícito. Feedback correto/incorreto usa `role=status` e não depende somente de cor.

O E2E Chromium percorre desktop até o último passo, muda para viewport 390×844, responde à Activity e confirma que feedback e `Concluir aula` permanecem utilizáveis. `/app/review` mantém fila curta, controles nativos, empty state e foco previsível.""",
)

append_once(
    "docs/TESTING.md",
    "## Cobertura do practice learning loop",
    """## Cobertura do practice learning loop

#21–#24 combinam unit tests do evaluator/SRS/mastery, component tests de todos os renderers, integration PostgreSQL de idempotência/ownership/rollback/retry limit/paginação/stale review e E2E Chromium de onboarding → Today → Lesson Player → Activity/feedback → completion. O relógio pedagógico permanece injetável; CI oficial valida migrations, content validation, E2E e build.""",
)

append_once(
    "docs/SECURITY_PRIVACY.md",
    "## Dados de prática e revisão",
    """## Dados de prática e revisão

`ActivityAttempt.answer` é dado do learner e pode conter texto em short-answer/translation. O payload completo não entra em logs/telemetria por padrão. Ownership é derivado da jornada autenticada, nunca de IDs enviados pelo browser. Attempts, ReviewEvents e ConceptEvidence compõem histórico pedagógico; nenhum provider externo recebe respostas nesta vertical determinística.""",
)

replace(
    "docs/ROADMAP.md",
    "> **Estado de execução em 2026-09-03:** a Fase 0 está concluída (#7–#16). A Fase 1 começou com a #17 e o PR atual cobre #18–#20: catálogo/elegibilidade, StudySession/Today e Lesson Player. Após o merge, a próxima dependência direta do fluxo é #21 (Exercise Engine). O conteúdo A0→A2 real continua nas issues editoriais; o catálogo deste PR é somente bootstrap estrutural.",
    "> **Estado de execução em 2026-09-03:** a Fase 0 está concluída (#7–#16) e #17–#20 já estão em `main`. O PR #86 cobre #21–#24 como uma vertical coesa: Exercise Engine → Attempt → SRS/Review → ConceptEvidence/Mastery. Após esse merge, a próxima dependência direta é #25 (Daily Session Planner v1). O conteúdo A0→A2 real continua nas issues editoriais; o material atual é bootstrap estrutural.",
)
replace(
    "docs/ROADMAP.md",
    "### Épico 1.5 — Exercise Engine\n\n**Próxima dependência direta após #20: #21.**",
    "### Épico 1.5 — Exercise Engine\n\n**Status: em review no PR #86 pela #21.**",
)
replace(
    "docs/ROADMAP.md",
    "### Épico 1.6 — Review/SRS\n\n- memory items;",
    "### Épico 1.6 — Review/SRS\n\n**Status: baseline em review no PR #86 pela #23.**\n\n- memory items;",
)
replace(
    "docs/ROADMAP.md",
    "### Épico 1.8 — Progress & Mastery\n\n- progress event model;",
    "### Épico 1.8 — Progress & Mastery\n\n**Status: ConceptEvidence + mastery v1 em review no PR #86 pela #24; UI completa permanece #27.**\n\n- progress event model;",
)
replace(
    "docs/ROADMAP.md",
    "Course catalog + curriculum eligibility        PR atual: #18\n  ↓\nStudySession + Today                           PR atual: #19\n  ↓\nLesson Player                                  PR atual: #20\n  ↓\nExercise Engine                                próximo após merge: #21\n  ↓\nReview/SRS\n  ↓\nDaily Session Planner completo\n  ↓\nProgress/Mastery",
    "Course catalog + curriculum eligibility        ✅ #18\n  ↓\nStudySession + Today                           ✅ #19\n  ↓\nLesson Player                                  ✅ #20\n  ↓\nExercise Engine + Attempts                     review: #21/#22 · PR #86\n  ↓\nReview/SRS + Concept Mastery                   review: #23/#24 · PR #86\n  ↓\nDaily Session Planner completo                 próximo: #25\n  ↓\nProgress UI/history                            #27",
)

replace(
    "docs/ISSUE_INDEX.md",
    "A **Foundation está concluída** e a Fase 1 já começou. A #17 entregou a primeira vertical real de learner profile/onboarding. As issues #18, #19 e #20 formam agora uma única vertical coesa em review no PR #85, porque catálogo/elegibilidade alimenta a sessão diária e o Lesson Player consome exatamente o item/revision planejado.\n\nApós o merge desse conjunto, a próxima frente elegível passa a ser:\n\n```text\n#21 Exercise Engine for deterministic activity types\n```",
    "A **Foundation está concluída** e a Fase 1 já avançou por #17–#20, hoje em `main`. As issues #21, #22, #23 e #24 formam a vertical coesa em review no PR #86: Activity determinística → Attempt transacional → SRS/Review → ConceptEvidence/Mastery.\n\nApós o merge desse conjunto, a próxima frente elegível passa a ser:\n\n```text\n#25 Daily Session Planner v1\n```",
)
replace("docs/ISSUE_INDEX.md", "- #18 Course catalog, enrollment and curriculum eligibility — **Em review no PR #85**", "- #18 Course catalog, enrollment and curriculum eligibility — **Concluída**")
replace("docs/ISSUE_INDEX.md", "- #19 StudySession data model and Today experience shell — **Em review no PR #85**", "- #19 StudySession data model and Today experience shell — **Concluída**")
replace("docs/ISSUE_INDEX.md", "- #20 Lesson Player with structured pedagogical blocks — **Em review no PR #85**", "- #20 Lesson Player with structured pedagogical blocks — **Concluída**")
replace("docs/ISSUE_INDEX.md", "- #21 Exercise Engine for deterministic activity types — **Próxima após merge do PR #85**", "- #21 Exercise Engine for deterministic activity types — **Em review no PR #86**")
replace("docs/ISSUE_INDEX.md", "- #22 Transactional attempt submission and feedback pipeline", "- #22 Transactional attempt submission and feedback pipeline — **Em review no PR #86**")
replace("docs/ISSUE_INDEX.md", "- #23 Spaced repetition engine and review queue", "- #23 Spaced repetition engine and review queue — **Em review no PR #86**")
replace("docs/ISSUE_INDEX.md", "- #24 Concept evidence and mastery model v1", "- #24 Concept evidence and mastery model v1 — **Em review no PR #86**")
replace(
    "docs/ISSUE_INDEX.md",
    "A Foundation concluiu **#7–#16** e a primeira vertical da Fase 1 concluiu **#17 — Learner profile and onboarding flow**. As issues **#18, #19 e #20** estão agrupadas no **PR #85**, atualmente em review/CI. Após o merge, a próxima issue elegível será **#21 — Exercise Engine for deterministic activity types**. Produção já está ativa como capability operacional, mas a #45 continua responsável pelo hardening e pelos runbooks restantes.",
    "A Foundation concluiu **#7–#16** e a Fase 1 já entregou **#17–#20**. As issues **#21–#24** estão agrupadas no **PR #86**, cobrindo o practice learning loop. Após o merge, a próxima issue elegível será **#25 — Daily Session Planner v1**. Produção já está ativa como capability operacional, mas a #45 continua responsável pelo hardening e pelos runbooks restantes.",
)
