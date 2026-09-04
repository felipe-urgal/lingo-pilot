import {
  LanguageModelProviderError,
  type LanguageModelProvider,
  type ProviderMetadata,
  type ProviderResult,
  type StructuredRequest,
  type TextRequest,
} from "./contracts.js";

export type FakeLanguageModelProviderOptions = Readonly<{
  textResponses?: readonly string[];
  structuredResponses?: readonly unknown[];
  model?: string;
}>;

export class FakeLanguageModelProvider implements LanguageModelProvider {
  readonly #textResponses: string[];
  readonly #structuredResponses: unknown[];
  readonly #model: string;

  constructor(options: FakeLanguageModelProviderOptions = {}) {
    this.#textResponses = [...(options.textResponses ?? [])];
    this.#structuredResponses = [...(options.structuredResponses ?? [])];
    this.#model = options.model ?? "fake-model";
  }

  async generateText(request: TextRequest): Promise<ProviderResult<string>> {
    const value = this.#textResponses.shift();
    if (value === undefined) {
      throw new LanguageModelProviderError(
        "empty_result",
        "Fake provider has no scripted text response",
      );
    }

    return Promise.resolve({ value, metadata: this.#metadata(request) });
  }

  async generateStructured<T>(
    request: StructuredRequest<T>,
  ): Promise<ProviderResult<T>> {
    if (this.#structuredResponses.length === 0) {
      throw new LanguageModelProviderError(
        "empty_result",
        "Fake provider has no scripted structured response",
      );
    }

    const scripted = this.#structuredResponses.shift();
    try {
      return Promise.resolve({
        value: request.output.parse(scripted),
        metadata: this.#metadata(request),
      });
    } catch {
      throw new LanguageModelProviderError(
        "invalid_output",
        "Fake provider structured response failed local validation",
      );
    }
  }

  #metadata(request: TextRequest): ProviderMetadata {
    return {
      provider: "fake",
      model: this.#model,
      prompt: { id: request.prompt.id, version: request.prompt.version },
      latencyMs: 0,
      attempts: 1,
    };
  }
}
