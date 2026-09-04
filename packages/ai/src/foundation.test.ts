import { describe, expect, it, vi } from "vitest";
import {
  AiConfigurationError,
  FakeLanguageModelProvider,
  LanguageModelProviderError,
  OpenAIResponsesProvider,
  PromptRegistry,
  defineStructuredOutput,
  parseAiEnvironment,
  type AiMetricRecord,
  type AiTelemetry,
  type PromptDefinition,
} from "./index.js";

const prompt: PromptDefinition = {
  id: "writing-evaluator",
  version: "v1",
  instructions: "Return only the requested evaluation.",
};

const evaluationOutput = defineStructuredOutput({
  name: "writing_evaluation",
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: { acceptable: { type: "boolean" } },
    required: ["acceptable"],
  },
  parse(value: unknown) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("acceptable" in value) ||
      typeof value.acceptable !== "boolean"
    ) {
      throw new Error("invalid evaluation");
    }
    return { acceptable: value.acceptable };
  },
});

describe("AI provider foundation", () => {
  it("registers prompts by stable id:version and rejects duplicates", () => {
    const registry = new PromptRegistry([prompt]);
    expect(registry.resolve({ id: "writing-evaluator", version: "v1" })).toEqual(
      prompt,
    );
    expect(() => registry.register(prompt)).toThrow(/already registered/);
    expect(() =>
      registry.resolve({ id: "writing-evaluator", version: "v2" }),
    ).toThrow(/not registered/);
  });

  it("uses a deterministic fake without API credentials and fails closed on invalid structured output", async () => {
    const provider = new FakeLanguageModelProvider({
      textResponses: ["ok"],
      structuredResponses: [{ acceptable: true }, { acceptable: "yes" }],
    });

    await expect(provider.generateText({ prompt, input: "hello" })).resolves.toMatchObject({
      value: "ok",
      metadata: { provider: "fake", prompt: { id: prompt.id, version: prompt.version } },
    });
    await expect(
      provider.generateStructured({ prompt, input: "first", output: evaluationOutput }),
    ).resolves.toMatchObject({ value: { acceptable: true } });
    await expect(
      provider.generateStructured({ prompt, input: "second", output: evaluationOutput }),
    ).rejects.toMatchObject({ code: "invalid_output", retryable: false });
  });

  it("keeps AI disabled without secrets and requires server-only OpenAI configuration when enabled", () => {
    expect(parseAiEnvironment({})).toEqual({ provider: "none" });
    expect(() => parseAiEnvironment({ AI_PROVIDER: "openai" })).toThrow(
      AiConfigurationError,
    );
    expect(
      parseAiEnvironment({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "test-model",
        AI_TIMEOUT_MS: "5000",
        AI_MAX_ATTEMPTS: "3",
        AI_MAX_OUTPUT_TOKENS: "700",
      }),
    ).toEqual({
      provider: "openai",
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 5000,
      maxAttempts: 3,
      maxOutputTokens: 700,
    });
  });

  it("sends Responses API structured output with store=false and validates locally", async () => {
    const requestBodies: unknown[] = [];
    const fetchStub = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          id: "resp_test",
          status: "completed",
          model: "test-model-2026-01-01",
          output: [
            {
              type: "message",
              content: [
                { type: "output_text", text: "{\"acceptable\":true}" },
              ],
            },
          ],
          usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 },
        }),
        { status: 200, headers: { "x-request-id": "req_test" } },
      );
    });

    const provider = new OpenAIResponsesProvider({
      apiKey: "secret-test-key",
      model: "test-model",
      fetch: fetchStub as typeof fetch,
      maxAttempts: 1,
    });
    const result = await provider.generateStructured({
      prompt,
      input: "student input",
      output: evaluationOutput,
      maxOutputTokens: 100,
    });

    expect(result.value).toEqual({ acceptable: true });
    expect(result.metadata).toMatchObject({
      provider: "openai",
      model: "test-model-2026-01-01",
      prompt: { id: "writing-evaluator", version: "v1" },
      attempts: 1,
      requestId: "req_test",
      usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
    });
    expect(requestBodies).toEqual([
      expect.objectContaining({
        model: "test-model",
        store: false,
        max_output_tokens: 100,
        text: {
          format: {
            type: "json_schema",
            name: "writing_evaluation",
            schema: evaluationOutput.jsonSchema,
            strict: true,
          },
        },
      }),
    ]);
  });

  it("retries only transient provider errors and records privacy-safe metrics", async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: "test-model",
            output: [
              { type: "message", content: [{ type: "output_text", text: "ok" }] },
            ],
          }),
          { status: 200 },
        ),
      );
    const metrics: AiMetricRecord[] = [];
    const telemetry: AiTelemetry = { recordMetric: (record) => metrics.push(record) };
    const sleep = vi.fn(async () => Promise.resolve());

    const provider = new OpenAIResponsesProvider({
      apiKey: "secret-test-key",
      model: "test-model",
      fetch: fetchStub,
      maxAttempts: 2,
      telemetry,
      sleep,
      now: (() => {
        let now = 100;
        return () => (now += 5);
      })(),
    });

    const result = await provider.generateText({
      prompt,
      input: "sensitive learner text that must not enter metrics",
    });
    expect(result.value).toBe("ok");
    expect(result.metadata.attempts).toBe(2);
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(metrics.map((metric) => metric.name)).toEqual([
      "ai.call.count",
      "ai.call.duration",
    ]);
    expect(JSON.stringify(metrics)).not.toContain("sensitive learner text");
    expect(JSON.stringify(metrics)).not.toContain("secret-test-key");
  });

  it("does not retry non-transient 4xx or invalid output", async () => {
    const badRequestFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("{}", { status: 400 }),
    );
    const provider = new OpenAIResponsesProvider({
      apiKey: "test-key",
      model: "test-model",
      fetch: badRequestFetch,
      maxAttempts: 3,
      sleep: vi.fn(async () => Promise.resolve()),
    });

    await expect(provider.generateText({ prompt, input: "x" })).rejects.toMatchObject({
      code: "invalid_request",
      retryable: false,
    });
    expect(badRequestFetch).toHaveBeenCalledTimes(1);

    const invalidOutputFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            { type: "message", content: [{ type: "output_text", text: "not-json" }] },
          ],
        }),
        { status: 200 },
      ),
    );
    const invalidProvider = new OpenAIResponsesProvider({
      apiKey: "test-key",
      model: "test-model",
      fetch: invalidOutputFetch,
      maxAttempts: 3,
      sleep: vi.fn(async () => Promise.resolve()),
    });
    await expect(
      invalidProvider.generateStructured({ prompt, input: "x", output: evaluationOutput }),
    ).rejects.toBeInstanceOf(LanguageModelProviderError);
    expect(invalidOutputFetch).toHaveBeenCalledTimes(1);
  });
});
