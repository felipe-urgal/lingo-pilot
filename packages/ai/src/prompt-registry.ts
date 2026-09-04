import type { PromptDefinition, PromptRef } from "./contracts.js";

const PROMPT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROMPT_VERSION_PATTERN = /^v[1-9][0-9]*$/;

export function promptKey(prompt: PromptRef): string {
  return `${prompt.id}:${prompt.version}`;
}

function validatePromptRef(prompt: PromptRef): void {
  if (!PROMPT_ID_PATTERN.test(prompt.id)) {
    throw new Error(`Invalid prompt id: ${prompt.id}`);
  }

  if (!PROMPT_VERSION_PATTERN.test(prompt.version)) {
    throw new Error(`Invalid prompt version: ${prompt.version}`);
  }
}

export class PromptRegistry {
  readonly #prompts = new Map<string, PromptDefinition>();

  constructor(prompts: readonly PromptDefinition[] = []) {
    for (const prompt of prompts) this.register(prompt);
  }

  register(prompt: PromptDefinition): void {
    validatePromptRef(prompt);
    if (prompt.instructions.trim() === "") {
      throw new Error(`Prompt instructions are required: ${promptKey(prompt)}`);
    }

    const key = promptKey(prompt);
    if (this.#prompts.has(key)) {
      throw new Error(`Prompt already registered: ${key}`);
    }

    this.#prompts.set(
      key,
      Object.freeze({
        id: prompt.id,
        version: prompt.version,
        instructions: prompt.instructions,
      }),
    );
  }

  resolve(ref: PromptRef): PromptDefinition {
    validatePromptRef(ref);
    const prompt = this.#prompts.get(promptKey(ref));
    if (!prompt) throw new Error(`Prompt not registered: ${promptKey(ref)}`);
    return prompt;
  }

  list(): readonly PromptRef[] {
    return [...this.#prompts.values()].map(({ id, version }) => ({ id, version }));
  }
}
