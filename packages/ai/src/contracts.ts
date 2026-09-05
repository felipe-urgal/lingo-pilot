export type PromptRef = Readonly<{
  id: string;
  version: string;
}>;

export type PromptDefinition = PromptRef &
  Readonly<{
    instructions: string;
  }>;

export type TokenUsage = Readonly<{
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}>;

export type ProviderMetadata = Readonly<{
  provider: string;
  model: string;
  prompt: PromptRef;
  latencyMs: number;
  attempts: number;
  requestId?: string;
  usage?: TokenUsage;
}>;

export type ProviderResult<T> = Readonly<{
  value: T;
  metadata: ProviderMetadata;
}>;

export type StructuredOutputContract<T> = Readonly<{
  name: string;
  jsonSchema: Readonly<Record<string, unknown>>;
  parse(value: unknown): T;
}>;

export type GenerationRequestBase = Readonly<{
  prompt: PromptDefinition;
  input: string;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}>;

export type TextRequest = GenerationRequestBase;

export type StructuredRequest<T> = GenerationRequestBase &
  Readonly<{
    output: StructuredOutputContract<T>;
  }>;

export interface LanguageModelProvider {
  generateText(request: TextRequest): Promise<ProviderResult<string>>;
  generateStructured<T>(
    request: StructuredRequest<T>,
  ): Promise<ProviderResult<T>>;
}

export const providerErrorCodes = [
  "timeout",
  "rate_limit",
  "provider_unavailable",
  "authentication",
  "invalid_request",
  "invalid_output",
  "refusal",
  "empty_result",
  "internal_integration",
] as const;

export type ProviderErrorCode = (typeof providerErrorCodes)[number];

export class LanguageModelProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options?: Readonly<{ retryable?: boolean; statusCode?: number }>,
  ) {
    super(message);
    this.name = "LanguageModelProviderError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.statusCode = options?.statusCode;
  }
}
