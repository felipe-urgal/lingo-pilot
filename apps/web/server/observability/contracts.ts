export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export type MetricRecord = Readonly<{
  name: string;
  value: number;
  unit?: "count" | "milliseconds";
  attributes?: Readonly<Record<string, string | number | boolean>>;
}>;

export interface TraceSpan {
  end(attributes?: Readonly<Record<string, string | number | boolean>>): void;
}

export interface TelemetryHooks {
  recordMetric(record: MetricRecord): void;
  startSpan(
    name: string,
    attributes?: Readonly<Record<string, string | number | boolean>>,
  ): TraceSpan;
}

const noopSpan: TraceSpan = {
  end() {},
};

export const noopTelemetryHooks: TelemetryHooks = {
  recordMetric() {},
  startSpan() {
    return noopSpan;
  },
};
