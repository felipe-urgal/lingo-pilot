# AI Provider Foundation

Este documento descreve o contrato técnico compartilhado criado pela issue #35. Ele existe para que writing, speaking, tutor e micropractice dependam de uma abstração estável, sem importar SDK ou detalhes de um provider externo nos use cases.

## Escopo atual

O package `@lingo-pilot/ai` fornece:

- `LanguageModelProvider` para geração de texto e structured outputs;
- `PromptRegistry` com chave estável `id:version`;
- `StructuredOutputContract<T>` com JSON Schema enviado ao provider e parser local obrigatório;
- `FakeLanguageModelProvider` determinístico para testes e CI sem API key;
- `OpenAIResponsesProvider` como adapter inicial de infraestrutura;
- timeout, retry limitado e taxonomy normalizada de erros;
- metadata de provider/model/prompt, request id e token usage quando disponível;
- hooks de telemetria privacy-safe para calls e latência.

Nenhuma feature de IA voltada ao aluno é habilitada apenas por esta foundation. `LearnerContext` (#36) e o eval harness versionado (#41) continuam gates antes de evaluations, tutor ou geração adaptativa.

## Boundary

A direção esperada é:

```text
use case
  ↓
LanguageModelProvider
  ↓
adapter de infraestrutura
  ↓
provider externo
```

Use cases não devem importar SDK, endpoint HTTP ou tipos do provider externo. Trocar ou adicionar provider deve ocorrer no adapter/composição, preservando os contratos compartilhados.

## Structured outputs

Structured output usa duas camadas deliberadas:

1. JSON Schema enviado ao provider quando o adapter suporta geração estruturada;
2. parser local obrigatório no `StructuredOutputContract<T>`.

A resposta só é aceita depois da validação local. JSON inválido ou payload que não satisfaça o parser resulta em `LanguageModelProviderError` com `code=invalid_output`; não existe fallback silencioso para objeto parcialmente válido.

## Prompts versionados

Cada prompt possui `id` e `version`. O `PromptRegistry` rejeita duplicatas da mesma chave e permite resolver explicitamente a versão usada.

Consumers que persistirem avaliações devem guardar, no mínimo:

```text
provider
model
prompt.id
prompt.version
```

Token usage e request id podem ser persistidos quando forem úteis para auditoria/operabilidade e estiverem disponíveis.

## Erros, timeout e retry

Erros normalizados atuais:

- `timeout`;
- `rate_limit`;
- `provider_unavailable`;
- `authentication`;
- `invalid_request`;
- `invalid_output`;
- `refusal`;
- `empty_result`;
- `internal_integration`.

Retry é permitido somente para condições transitórias: timeout/network, HTTP 429 e 5xx. Erros 4xx não transitórios e output inválido não recebem retry cego.

O adapter inicial limita `maxAttempts` a 3 e aplica backoff curto. `maxOutputTokens` também é limitado pelo provider instance para impedir que um consumer amplie o budget unilateralmente.

## Configuração

IA fica desabilitada por default:

```text
AI_PROVIDER=none
```

Para habilitar o adapter OpenAI em runtime server-side:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<server-only secret>
OPENAI_MODEL=<model id>
AI_TIMEOUT_MS=10000
AI_MAX_ATTEMPTS=2
AI_MAX_OUTPUT_TOKENS=800
```

`OPENAI_API_KEY` nunca deve usar prefixo `NEXT_PUBLIC_`, entrar em bundle de browser, log, metadata de request ou telemetria.

O CI não depende de credenciais reais. Testes usam o fake provider e `fetch` injetado.

## Privacidade e telemetria

A foundation não registra prompt completo, learner input, resposta completa ou secret por default.

Os hooks atuais emitem registros equivalentes a:

```text
ai.call.count
ai.call.duration
```

com dimensões operacionais como provider, model, operação, result, attempts e error code. Consumers devem manter o mesmo princípio de minimização quando ligarem esses hooks à baseline de observabilidade do produto.

## Adapter OpenAI inicial

O adapter inicial usa a Responses API via `fetch` nativo. Structured outputs usam `json_schema` em modo strict e requests usam `store=false`.

Essa escolha é de infraestrutura, não de domínio. O contrato `LanguageModelProvider` continua sendo a dependência dos consumers. A decisão e seus limites estão registrados em `docs/ADR/0007-openai-responses-as-initial-ai-adapter.md`.

## O que ainda não está liberado

A #35 não entrega:

- learner context pedagógico;
- evaluation prompts finais;
- thresholds de qualidade;
- writing/speaking feedback ao aluno;
- tutor conversacional;
- micropractice gerada;
- persistência de avaliações específicas de feature.

Esses fluxos só devem avançar depois dos gates registrados no backlog e nos evals correspondentes.
