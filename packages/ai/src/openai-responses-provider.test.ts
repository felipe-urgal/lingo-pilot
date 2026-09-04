import { describe, expect, it, vi } from "vitest";
import {
  OpenAIResponsesProvider,
  type PromptDefinition,
} from "./index.js";

const prompt: PromptDefinition = {
  id: "timeout-test",
  version: "v1",
  instructions: "Return a short response.",
};

describe("OpenAIResponsesProvider timeout", () => {
  it("aborts an overdue request and returns a categorized timeout error", async () => {
    const fetchStub = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted", "AbortError")),
            { once: true },
          );
        }),
    );

    const provider = new OpenAIResponsesProvider({
      apiKey: "test-key",
      model: "test-model",
      fetch: fetchStub as typeof fetch,
      timeoutMs: 5,
      maxAttempts: 1,
    });

    await expect(
      provider.generateText({ prompt, input: "timeout" }),
    ).rejects.toMatchObject({
      code: "timeout",
      retryable: true,
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});
