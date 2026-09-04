import type { ProviderErrorCode } from "./contracts.js";

export type AiMetricRecord = Readonly<{
  name: "ai.call.count" | "ai.call.duration";
  value: number;
  unit: "count" | "milliseconds";
  attributes: Readonly<{
    provider: string;
    model: string;
    operation: "text" | "structured";
    result: "success" | "failure";
    attempts: number;
    errorCode?: ProviderErrorCode;
  }>;
}>;

export interface AiTelemetry {
  recordMetric(record: AiMetricRecord): void;
}

export const noopAiTelemetry: AiTelemetry = {
  recordMetric() {},
};

export function recordAiCall(
  telemetry: AiTelemetry,
  input: Readonly<{
    provider: string;
    model: string;
    operation: "text" | "structured";
    result: "success" | "failure";
    attempts: number;
    durationMs: number;
    errorCode?: ProviderErrorCode;
  }>,
): void {
  const attributes = {
    provider: input.provider,
    model: input.model,
    operation: input.operation,
    result: input.result,
    attempts: input.attempts,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  } as const;

  telemetry.recordMetric({
    name: "ai.call.count",
    value: 1,
    unit: "count",
    attributes,
  });
  telemetry.recordMetric({
    name: "ai.call.duration",
    value: input.durationMs,
    unit: "milliseconds",
    attributes,
  });
}
