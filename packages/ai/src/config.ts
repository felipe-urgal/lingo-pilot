export type DisabledAiConfig = Readonly<{
  provider: "none";
}>;

export type OpenAiConfig = Readonly<{
  provider: "openai";
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxAttempts: number;
  maxOutputTokens: number;
}>;

export type AiConfig = DisabledAiConfig | OpenAiConfig;

export class AiConfigurationError extends Error {
  readonly key: string;

  constructor(key: string, message: string) {
    super(`[${key}] ${message}`);
    this.name = "AiConfigurationError";
    this.key = key;
  }
}

function requireString(value: string | undefined, key: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new AiConfigurationError(key, "value is required");
  return normalized;
}

function parseInteger(
  value: string | undefined,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^[0-9]+$/.test(value.trim())) {
    throw new AiConfigurationError(key, "must be an integer");
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new AiConfigurationError(key, `must be between ${min} and ${max}`);
  }
  return parsed;
}

export function parseAiEnvironment(source: Readonly<Record<string, string | undefined>>): AiConfig {
  const provider = source.AI_PROVIDER?.trim().toLowerCase() || "none";
  if (provider === "none") return Object.freeze({ provider: "none" });
  if (provider !== "openai") {
    throw new AiConfigurationError("AI_PROVIDER", "must be none or openai");
  }

  return Object.freeze({
    provider: "openai",
    apiKey: requireString(source.OPENAI_API_KEY, "OPENAI_API_KEY"),
    model: requireString(source.OPENAI_MODEL, "OPENAI_MODEL"),
    timeoutMs: parseInteger(source.AI_TIMEOUT_MS, "AI_TIMEOUT_MS", 10_000, 100, 60_000),
    maxAttempts: parseInteger(source.AI_MAX_ATTEMPTS, "AI_MAX_ATTEMPTS", 2, 1, 3),
    maxOutputTokens: parseInteger(
      source.AI_MAX_OUTPUT_TOKENS,
      "AI_MAX_OUTPUT_TOKENS",
      800,
      1,
      8_192,
    ),
  });
}
