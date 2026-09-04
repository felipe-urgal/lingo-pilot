# ADR 0007 — OpenAI Responses API as initial AI adapter

- Status: Accepted
- Date: 2026-09-04
- Related issue: #35

## Context

LingoPilot needs a shared AI foundation before writing/speaking evaluation, tutor and adaptive micropractice. Those consumers must not couple application/domain code to a provider SDK, but the first implementation still needs a concrete adapter so timeout, structured output, retries, metadata and observability contracts can be exercised end to end.

## Decision

Use the OpenAI Responses API as the initial infrastructure adapter behind `LanguageModelProvider`.

The adapter:

- uses native `fetch`, not a provider SDK;
- sends structured requests with JSON Schema and strict structured output;
- always performs local parsing/validation before accepting structured data;
- sends `store=false`;
- categorizes timeout, rate limit, 5xx, auth, invalid request/output, refusal and empty-result failures;
- retries only transient failures and caps attempts;
- caps output tokens;
- exposes provider/model/prompt/request/token metadata without exposing secrets or full learner content;
- emits privacy-safe call/latency telemetry through an injected hook.

`LanguageModelProvider`, prompt contracts and structured-output contracts remain provider-neutral. Use cases depend only on those contracts.

## Consequences

### Positive

- writing, speaking, tutor and micropractice can reuse one stable boundary;
- CI remains deterministic through the fake provider and injected `fetch`;
- provider migration does not require rewriting use cases;
- structured output remains fail-closed even if the external provider returns malformed content;
- provider-specific storage and retry behavior are explicit and testable.

### Trade-offs

- the adapter contains provider-specific HTTP envelope parsing;
- model availability, pricing and provider behavior can change independently of the application;
- token metadata is available, but monetary cost is not computed in the shared domain because pricing is provider/model/time dependent.

## Rejected alternatives

### Import provider SDK directly in feature use cases

Rejected because it would duplicate integration logic and make evaluation/tutor features provider-coupled.

### Make OpenAI a domain decision

Rejected because provider selection is infrastructure. The domain should describe pedagogical intent and validated results, not vendor APIs.

### Accept provider-side schema validation without local parsing

Rejected because application correctness cannot rely solely on external enforcement. Local validation remains mandatory.

## Follow-up

- #36 builds the constrained `LearnerContext` on top of this boundary;
- #41 establishes versioned evals and quality gates;
- #38/#39 may consume the provider only after those prerequisites are satisfied;
- #37/#40 reuse the same foundation later.
