import {
  LanguageModelProviderError,
  type LanguageModelProvider,
  type ProviderErrorCode,
  type ProviderResult,
  type StructuredRequest,
  type TextRequest,
  type TokenUsage,
} from "./contracts.js";
import { parseStructuredOutput } from "./structured-output.js";
import {
  noopAiTelemetry,
  recordAiCall,
  type AiTelemetry,
} from "./telemetry.js";

const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

type FetchLike = typeof globalThis.fetch;
type Sleep = (milliseconds: number) => Promise<void>;
type Now = () => number;

export type OpenAIResponsesProviderOptions = Readonly<{
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxAttempts?: number;
  maxOutputTokens?: number;
  telemetry?: AiTelemetry;
  fetch?: FetchLike;
  sleep?: Sleep;
  now?: Now;
  endpoint?: string;
}>;

type OpenAiPayload = Readonly<{
  id?: unknown;
  status?: unknown;
  model?: unknown;
  output?: unknown;
  usage?: unknown;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function tokenUsage(payload: OpenAiPayload): TokenUsage | undefined {
  if (!isRecord(payload.usage)) return undefined;
  const inputTokens = numberField(payload.usage, "input_tokens");
  const outputTokens = numberField(payload.usage, "output_tokens");
  const totalTokens = numberField(payload.usage, "total_tokens");
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return { inputTokens, outputTokens, totalTokens };
}

function extractOutputText(payload: OpenAiPayload): string {
  if (!Array.isArray(payload.output)) {
    throw new LanguageModelProviderError(
      "empty_result",
      "Provider response did not contain output items",
    );
  }

  const textParts: string[] = [];
  for (const item of payload.output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (!isRecord(content)) continue;
      if (content.type === "refusal") {
        throw new LanguageModelProviderError(
          "refusal",
          "Provider refused the request",
        );
      }
      if (content.type === "output_text" && typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  const text = textParts.join("").trim();
  if (!text) {
    throw new LanguageModelProviderError(
      "empty_result",
      "Provider response did not contain output text",
    );
  }
  return text;
}

function mapHttpError(status: number): LanguageModelProviderError {
  if (status === 401 || status === 403) {
    return new LanguageModelProviderError(
      "authentication",
      "Provider rejected credentials",
      { statusCode: status },
    );
  }
  if (status === 408) {
    return new LanguageModelProviderError("timeout", "Provider request timed out", {
      retryable: true,
      statusCode: status,
    });
  }
  if (status === 429) {
    return new LanguageModelProviderError(
      "rate_limit",
      "Provider rate limit reached",
      { retryable: true, statusCode: status },
    );
  }
  if (status >= 500) {
    return new LanguageModelProviderError(
      "provider_unavailable",
      "Provider is unavailable",
      { retryable: true, statusCode: status },
    );
  }
  return new LanguageModelProviderError(
    "invalid_request",
    "Provider rejected the request",
    { statusCode: status },
  );
}

function normalizeThrownError(error: unknown): LanguageModelProviderError {
  if (error instanceof LanguageModelProviderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new LanguageModelProviderError("timeout", "Provider request timed out", {
      retryable: true,
    });
  }
  return new LanguageModelProviderError(
    "provider_unavailable",
    "Provider request failed before a valid response was received",
    { retryable: true },
  );
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class OpenAIResponsesProvider implements LanguageModelProvider {
  readonly #apiKey: string;
  readonly #model: string;
  readonly #timeoutMs: number;
  readonly #maxAttempts: number;
  readonly #maxOutputTokens: number;
  readonly #telemetry: AiTelemetry;
  readonly #fetch: FetchLike;
  readonly #sleep: Sleep;
  readonly #now: Now;
  readonly #endpoint: string;

  constructor(options: OpenAIResponsesProviderOptions) {
    if (!options.apiKey.trim()) throw new Error("OpenAI apiKey is required");
    if (!options.model.trim()) throw new Error("OpenAI model is required");
    this.#apiKey = options.apiKey;
    this.#model = options.model;
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#maxAttempts = options.maxAttempts ?? 2;
    this.#maxOutputTokens = options.maxOutputTokens ?? 800;
    if (this.#timeoutMs < 1) throw new Error("timeoutMs must be positive");
    if (this.#maxAttempts < 1 || this.#maxAttempts > 3) {
      throw new Error("maxAttempts must be between 1 and 3");
    }
    if (this.#maxOutputTokens < 1) {
      throw new Error("maxOutputTokens must be positive");
    }
    this.#telemetry = options.telemetry ?? noopAiTelemetry;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#sleep = options.sleep ?? defaultSleep;
    this.#now = options.now ?? Date.now;
    this.#endpoint = options.endpoint ?? OPENAI_RESPONSES_ENDPOINT;
  }

  async generateText(request: TextRequest): Promise<ProviderResult<string>> {
    return this.#execute("text", request, undefined, (payload) => extractOutputText(payload));
  }

  async generateStructured<T>(
    request: StructuredRequest<T>,
  ): Promise<ProviderResult<T>> {
    return this.#execute(
      "structured",
      request,
      {
        type: "json_schema",
        name: request.output.name,
        schema: request.output.jsonSchema,
        strict: true,
      },
      (payload) => parseStructuredOutput(request.output, extractOutputText(payload)),
    );
  }

  async #execute<T>(
    operation: "text" | "structured",
    request: TextRequest,
    format: Readonly<Record<string, unknown>> | undefined,
    parse: (payload: OpenAiPayload) => T,
  ): Promise<ProviderResult<T>> {
    const startedAt = this.#now();
    let attempts = 0;
    let lastError: LanguageModelProviderError | undefined;

    while (attempts < this.#maxAttempts) {
      attempts += 1;
      try {
        const response = await this.#fetchWithTimeout(request, format);
        if (!response.ok) throw mapHttpError(response.status);

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new LanguageModelProviderError(
            "invalid_output",
            "Provider returned a non-JSON response envelope",
          );
        }
        if (!isRecord(payload)) {
          throw new LanguageModelProviderError(
            "invalid_output",
            "Provider returned an invalid response envelope",
          );
        }

        const typedPayload = payload as OpenAiPayload;
        const value = parse(typedPayload);
        const latencyMs = Math.max(0, this.#now() - startedAt);
        recordAiCall(this.#telemetry, {
          provider: "openai",
          model: this.#model,
          operation,
          result: "success",
          attempts,
          durationMs: latencyMs,
        });

        return {
          value,
          metadata: {
            provider: "openai",
            model:
              typeof typedPayload.model === "string"
                ? typedPayload.model
                : this.#model,
            prompt: { id: request.prompt.id, version: request.prompt.version },
            latencyMs,
            attempts,
            requestId: response.headers.get("x-request-id") ?? undefined,
            usage: tokenUsage(typedPayload),
          },
        };
      } catch (error) {
        const normalized = normalizeThrownError(error);
        lastError = normalized;
        if (!normalized.retryable || attempts >= this.#maxAttempts) break;
        await this.#sleep(Math.min(250 * 2 ** (attempts - 1), 1_000));
      }
    }

    const finalError =
      lastError ??
      new LanguageModelProviderError(
        "internal_integration",
        "Provider operation failed without a categorized error",
      );
    recordAiCall(this.#telemetry, {
      provider: "openai",
      model: this.#model,
      operation,
      result: "failure",
      attempts,
      durationMs: Math.max(0, this.#now() - startedAt),
      errorCode: finalError.code,
    });
    throw finalError;
  }

  async #fetchWithTimeout(
    request: TextRequest,
    format: Readonly<Record<string, unknown>> | undefined,
  ): Promise<Response> {
    const controller = new AbortController();
    const onAbort = (): void => controller.abort();
    if (request.signal?.aborted) controller.abort();
    else request.signal?.addEventListener("abort", onAbort, { once: true });

    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      return await this.#fetch(this.#endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.#model,
          instructions: request.prompt.instructions,
          input: request.input,
          store: false,
          max_output_tokens: Math.min(
            request.maxOutputTokens ?? this.#maxOutputTokens,
            this.#maxOutputTokens,
          ),
          ...(format ? { text: { format } } : {}),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener("abort", onAbort);
    }
  }
}

export function isRetryableProviderErrorCode(code: ProviderErrorCode): boolean {
  return code === "timeout" || code === "rate_limit" || code === "provider_unavailable";
}
