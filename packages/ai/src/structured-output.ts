import {
  LanguageModelProviderError,
  type StructuredOutputContract,
} from "./contracts.js";

const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function defineStructuredOutput<T>(
  contract: StructuredOutputContract<T>,
): StructuredOutputContract<T> {
  if (!OUTPUT_NAME_PATTERN.test(contract.name)) {
    throw new Error(
      "Structured output name must use 1-64 letters, numbers, underscores or dashes",
    );
  }

  if (Object.keys(contract.jsonSchema).length === 0) {
    throw new Error("Structured output JSON schema must not be empty");
  }

  return Object.freeze(contract);
}

export function parseStructuredOutput<T>(
  contract: StructuredOutputContract<T>,
  rawText: string,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new LanguageModelProviderError(
      "invalid_output",
      "Provider returned invalid JSON for a structured output",
    );
  }

  try {
    return contract.parse(parsed);
  } catch {
    throw new LanguageModelProviderError(
      "invalid_output",
      "Provider output failed local structured-output validation",
    );
  }
}
