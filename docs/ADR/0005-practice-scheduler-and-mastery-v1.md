# ADR 0005 — Practice scheduler and mastery V1

- Status: Accepted
- Date: 2026-09-03
- Issues: #21, #22, #23, #24

## Context

The Study Engine needs a reproducible first implementation for deterministic exercise evaluation, spaced review scheduling and concept mastery. These decisions affect persisted learner state and therefore cannot live as UI-only heuristics.

`docs/LEARNING_ENGINE.md` preferred FSRS for the first SRS implementation, while also requiring the algorithm to remain encapsulated, versioned and replaceable. For the current A0 bootstrap there is not yet enough historical review data to calibrate FSRS parameters, and adding a scheduling dependency now would make the first vertical harder to audit without improving the available product signal.

Mastery has the same constraint: the first score must be explicit and conservative, must not interpret one recognition answer as mastery, and must be recomputable from immutable evidence.

## Decision

### Review scheduling

Introduce `ReviewScheduler` in `packages/learning` and ship `review-scheduler-v1` as a small deterministic scheduler behind that interface.

The scheduler receives the persisted state, a grade and an injected clock. The V1 intervals are:

| Grade | First review | Subsequent review |
| --- | ---: | ---: |
| `again` | 10 minutes | 10 minutes |
| `hard` | 12 hours | `max(1 day, previous × 1.25)` |
| `good` | 1 day | `max(2 days, previous × 2)` |
| `easy` | 3 days | `max(4 days, previous × 3)` |

Exercise result is converted to grade by an explicit rule:

- incorrect → `again`;
- correct after a hint → `hard`;
- correct guided retrieval → `good`;
- correct independent retrieval → `easy`.

The learner is not asked to choose those internal grade names.

Every `MemoryItem` and `ReviewEvent` stores `algorithmVersion`. Future adoption of FSRS must introduce a new version and a migration/recalculation plan rather than silently changing the meaning of existing events.

### Mastery

Introduce immutable `ConceptEvidence` and a materialized `MasteryState`. `mastery-v1` is recomputed from the complete evidence sequence for a learner+concept.

Evidence weights are explicit:

- guided: `0.45`;
- independent retrieval: `1.0`;
- delayed review: `1.4`.

Modality multipliers are:

- reading `0.9`;
- listening `1.0`;
- writing `1.15`;
- speaking `1.2`;
- mixed `1.1`.

Support reduces evidence weight by `0.15` per support level, bounded to a minimum multiplier of `0.4`. An incorrect result from the last seven days receives a `1.25` negative multiplier.

The score uses a conservative prior:

```text
positive = Σ positive evidence weights
negative = Σ negative evidence weights
score = (1 + positive) / (2 + positive + negative)
confidence = min((positive + negative) / 4, 1)
```

Both values are persisted as integer percentages in the `0..100` range together with `algorithmVersion`.

A concept is exposed as weak to downstream planning when `score < 60` and `confidence >= 20`. Issue #25 decides how the planner uses that signal.

## Consequences

### Positive

- Same state + same grade + same clock produces the same review result.
- Scheduler and mastery logic are pure and testable outside Next.js and PostgreSQL.
- Attempts, review events and evidence remain immutable audit history.
- Mastery can be recomputed after a future algorithm change.
- The first production vertical has no hidden AI/provider dependency.
- Replacing the scheduler with FSRS does not require changing application or repository boundaries.

### Trade-offs

- `review-scheduler-v1` is intentionally simpler than FSRS and is not claimed to be a calibrated memory model.
- The interval constants will need product data before they should be treated as optimized.
- `mastery-v1` is a transparent heuristic, not a psychometric model.
- The current weak-concept threshold is an interface for #25, not a final curriculum policy.

## Follow-up

Any material change to the interval rule, grade mapping, mastery weights, prior, confidence interpretation or weak-concept threshold requires:

1. a new algorithm version;
2. sequence tests comparing old and new behavior;
3. an explicit migration/recalculation decision;
4. an ADR update when persisted meaning changes.
