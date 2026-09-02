import type { LogFields, Logger, LogLevel } from "./contracts";
import { sanitizeLogFields } from "./sanitize";

export type LogSink = (level: LogLevel, line: string) => void;

export type LoggerOptions = Readonly<{
  service: string;
  environment: string;
  version: string;
  deploymentId?: string;
  pretty?: boolean;
  sink?: LogSink;
  baseFields?: LogFields;
}>;

function defaultSink(level: LogLevel, line: string): void {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

function formatPretty(
  record: Readonly<Record<string, unknown>>,
  message: string,
): string {
  const { timestamp, level, service, ...fields } = record;
  const suffix = Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : "";
  return `${String(timestamp)} ${String(level).toUpperCase()} ${String(service)} ${message}${suffix}`;
}

export function createLogger(options: LoggerOptions): Logger {
  const sink = options.sink ?? defaultSink;
  const baseFields = options.baseFields ?? {};

  function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
    const safeFields = sanitizeLogFields({ ...baseFields, ...fields });
    const record = {
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      environment: options.environment,
      version: options.version,
      ...(options.deploymentId ? { deploymentId: options.deploymentId } : {}),
      ...safeFields,
    };
    const line = options.pretty
      ? formatPretty(record, message)
      : JSON.stringify({ ...record, message });
    sink(level, line);
  }

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
    child: (fields) => createLogger({ ...options, baseFields: { ...baseFields, ...fields } }),
  };
}
