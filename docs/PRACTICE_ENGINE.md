# Practice Engine — Attempts, Reviews and Mastery

## 1. Scope

This document describes the executable vertical delivered by issues #21–#24:

```text
Authored Activity
      ↓
Deterministic evaluator
      ↓
Transactional ActivityAttempt
      ↓
ConceptEvidence + ActivityProgress
      ↓
MemoryItem / due queue
      ↓
ReviewEvent
      ↓
MasteryState
```

The planner (#25), session hardening (#26), complete progress surfaces (#27) and full A0 editorial migration (#28) remain outside this slice.

## 2. Boundaries

The implementation follows the repository dependency rules:

- `packages/content` owns the versioned Activity/Concept content documents;
- `packages/learning` owns pure deterministic evaluation, review scheduling and mastery math;
- `packages/domain` owns immutable learner contracts and the `PracticeRepository` port;
- `packages/db` owns PostgreSQL schema, transactions and repository implementation;
- `apps/web/server/application` owns use cases and authorization-aware orchestration;
- `apps/web/app` adapts HTTP/forms and renders accessible controls.

No evaluator, scheduler or mastery formula depends on React, Next.js, PostgreSQL or an AI provider.

## 3. Deterministic activities

`packages/learning/src/activity-engine.ts` supports:

- `single-choice`;
- `multiple-choice`;
- `fill-blank`;
- `word-order`;
- `matching`;
- `short-answer`;
- `translation`.

Speaking, writing and AI-evaluated activities are deliberately not accepted by this engine. Unknown/unsupported activity definitions fail closed.

### Text normalization

Text evaluation performs only explicit normalization:

1. Unicode `NFKC` normalization;
2. trim leading/trailing whitespace;
3. collapse repeated whitespace;
4. locale-aware case folding unless the activity requests case sensitivity.

It does **not** silently remove accents or punctuation. Accepted variants must be authored explicitly.

### Presentation

The canonical pedagogical metadata remains in versioned Activity content. UI-specific choice/token/pair labels are mapped by `apps/web/server/practice/activity-catalog.ts`.

The current authored A0 example is:

- `concept.a0.bootstrap.lesson-flow`;
- `activity.a0.bootstrap.lesson-flow-check`;
- linked to `lesson.a0.bootstrap.orientation` and its existing objective.

The published lesson revision is not rewritten by this change.

## 4. Activity submission

`createSubmitActivityAttempt` is the application boundary. A browser never submits `correct=true` or a mastery score.

The server:

1. loads the authenticated learner journey;
2. checks whether the operation key already produced an Attempt and returns it idempotently when applicable;
3. validates identifiers and loads the published authored Activity;
4. reloads the StudySession owned by the learner;
5. requires the StudySession and SessionItem to still be `in_progress` and verifies the SessionItem/lesson relationship;
6. evaluates the answer with the deterministic engine;
7. derives evidence kind and initial review grade;
8. persists the transaction through `PracticeRepository`.

The transaction creates, as one atomic operation:

- immutable `ActivityAttempt`;
- derived `ActivityProgress`;
- initial `MemoryItem` when the concept does not already have one;
- immutable `ConceptEvidence` for every distinct concept;
- recomputed `MasteryState`.

A failure during mastery projection rolls back the whole transaction.

### Idempotency and retry policy

`ActivityAttempt` is unique by `(enrollmentId, operationKey)`. A retry returns the already persisted attempt before mutable session state is re-evaluated, so a network retry cannot create duplicate progress/evidence or fail merely because the first request already changed state.

Multiple legitimate attempts use different operation keys and remain separate immutable history. Each Activity owns a configured `maxAttempts`; the repository serializes submissions by Enrollment + Activity before reading `ActivityProgress`, so concurrent requests cannot exceed that limit.

## 5. Review scheduling

`ReviewScheduler` is a pure, versioned interface. The first implementation is `review-scheduler-v1`; its decision and interval table are recorded in `docs/ADR/0005-practice-scheduler-and-mastery-v1.md`.

Result-to-grade mapping:

| Result | Internal grade |
| --- | --- |
| incorrect | `again` |
| correct with hint | `hard` |
| correct guided retrieval | `good` |
| correct independent retrieval | `easy` |

The learner is not required to rate their own memory using these internal labels.

## 6. Due queue and ReviewEvent

`MemoryItem` stores:

- learner/enrollment ownership;
- concept;
- source Activity;
- current `dueAt`;
- current interval;
- review count;
- scheduler version;
- last update timestamp.

The due query is bounded to at most 100 rows, ordered deterministically by `dueAt`, then `id`, and supports deterministic offset pagination.

`/app/review` consumes this queue and shows one due item at a time. After a submission, the server re-evaluates the answer, derives the grade, computes the new schedule and persists an immutable `ReviewEvent` plus delayed-review evidence.

Review update uses compare-and-set on `expectedReviewCount`. A stale concurrent request returns `stale-review` instead of advancing the same MemoryItem twice.

Review retry is idempotent through `(enrollmentId, operationKey)` and is resolved before the mutable due-state check. `ReviewEvent → MemoryItem` uses `ON DELETE RESTRICT`, so deleting current scheduling state cannot erase historical review events.

## 7. Mastery V1

`ConceptEvidence` is immutable and records:

- source Attempt or ReviewEvent;
- concept;
- evidence kind;
- modality;
- correct/incorrect outcome;
- support level;
- occurrence time.

`MasteryState` is a materialized projection per learner+concept. It stores integer `scorePercent`, `confidencePercent`, algorithm version and update time.

The complete V1 formula and weights are recorded in ADR 0005. Important semantics:

- one guided recognition success is intentionally weak evidence;
- independent retrieval counts more than guided work;
- delayed review counts more than immediate retrieval;
- writing/speaking may contribute more than reading recognition;
- support reduces evidence strength;
- a recent error has stronger negative weight;
- the projection can be recomputed from evidence history.

`listWeakConcepts` exposes concepts with score below 60 and confidence of at least 20 for the future planner. It does not itself decide daily planning priority.

## 8. Database model

Migration `0004_practice_learning_loop.sql` adds:

- `activity_attempts`;
- `activity_progress`;
- `memory_items`;
- `review_events`;
- `concept_evidence`;
- `mastery_states`.

Important constraints/indexes:

- operation-key uniqueness for Attempts and ReviewEvents;
- learner+concept uniqueness for MemoryItem and MasteryState;
- immutable evidence source+concept uniqueness;
- `0..100` constraints for score/confidence;
- non-negative hint/review counters;
- due queue index `(enrollment_id, due_at, id)`;
- evidence history index `(enrollment_id, concept_id, occurred_at)`;
- weak-concept projection index;
- restrictive ReviewEvent → MemoryItem deletion semantics to preserve pedagogical history.

Ownership is always scoped through `Enrollment`. A supplied SessionItem is revalidated by joining its StudySession back to the same enrollment.

## 9. Accessibility and interaction

`PracticeActivityForm` uses native keyboard-operable controls:

- radio buttons for single-choice;
- checkboxes for multiple-choice;
- text input for deterministic text answers;
- ordered `select` controls for word-order as a keyboard-first alternative to drag-and-drop;
- labeled `select` controls for matching.

Prompt/fieldset relationships use semantic headings, legends and labels. Feedback is exposed with `role="status"`.

Hints are visible through a native `details` disclosure. The current UI asks the learner to explicitly mark whether the hint was used so hint usage can be persisted with the attempt/review. This is pedagogical metadata, not an authorization signal.

## 10. HTTP and authorization

Routes:

- `POST /api/study/activity/submit`;
- `POST /api/study/review/submit`.

Both require same-origin POSTs and an authenticated learner journey.

The Activity route accepts a new Attempt only while the owned StudySession and SessionItem are still in progress, and confirms the supplied SessionItem/lesson relationship before writing. A duplicate operation key returns its original Attempt idempotently even if the first successful request already changed mutable state.

The Review route does not trust a client-provided grade. It accepts only a due MemoryItem owned by the learner and derives the grade from the server evaluation; retries with an already-persisted operation key return the original ReviewEvent.

## 11. Observability and privacy

Successful Activity logs contain only operational metadata such as:

- Activity ID;
- Attempt ID;
- correctness;
- duplicate flag.

Successful Review logs contain:

- Activity ID;
- ReviewEvent ID;
- correctness;
- internal grade;
- duplicate flag;
- next due timestamp.

Rejected submissions record a typed reason. **Full textual learner answers are not logged by these routes.**

## 12. Tests

Pure learning tests cover:

- every supported deterministic activity discriminator;
- duplicate selections;
- Unicode/case/whitespace normalization;
- accent preservation;
- word-order/matching;
- invalid answer shape and unknown activity safe failure;
- deterministic review sequences;
- result-to-grade mapping;
- one guided success not producing high mastery;
- delayed retrieval carrying stronger evidence;
- recent errors lowering mastery;
- mastery recomputation.

Component tests cover all deterministic renderers and the keyboard-first word-order/matching alternatives.

PostgreSQL integration tests cover:

- idempotent Attempt retry;
- ActivityProgress/evidence/mastery creation;
- configured retry limit without extra Attempt/evidence;
- deterministic due queue pagination;
- idempotent Review retry;
- stale review compare-and-set;
- transaction rollback when mastery projection fails;
- cross-enrollment SessionItem rejection without resource leakage.

Playwright covers onboarding → Today → resumable Lesson Player → deterministic Activity submission/feedback in a 390×844 viewport → explicit lesson completion.

## 13. Known boundaries

This slice intentionally does not:

- replace `today-shell-v1` with the complete planner;
- let reviews consume a time budget inside the daily planner;
- create AI-evaluated writing/speaking feedback;
- claim `review-scheduler-v1` is calibrated FSRS;
- claim `mastery-v1` is a psychometric model;
- expose a complete learner progress dashboard;
- migrate every A0 lesson/activity to the new practice flow.

Those changes must build on the immutable events and versioned interfaces established here rather than bypass them.
