const REDACTED = "[redacted]";
const REDACTED_TEXT = "[redacted-text]";

const sensitiveKeyPattern =
  /(authorization|cookie|password|secret|token|email|payload|body|prompt|transcript|audio|answer|content|text)/i;

const allowedStringKeys = new Set([
  "deploymentId",
  "environment",
  "errorCode",
  "errorName",
  "method",
  "module",
  "requestId",
  "result",
  "route",
  "service",
  "traceId",
  "useCase",
  "version",
]);

function sanitizeString(value: string, key: string): string {
  if (sensitiveKeyPattern.test(key)) return REDACTED;
  return allowedStringKeys.has(key) ? value : REDACTED_TEXT;
}

function sanitizeObject(
  value: Readonly<Record<string, unknown>>,
  seen: WeakSet<object>,
): Record<string, unknown> {
  if (seen.has(value)) return { circular: true };
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sanitizeLogValue(item, key, seen),
    ]),
  );
}

function sanitizeLogValue(
  value: unknown,
  key: string,
  seen: WeakSet<object>,
): unknown {
  if (typeof value === "string") return sanitizeString(value, key);
  if (typeof value === "number" || typeof value === "boolean" || value === null)
    return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value.map((item) => sanitizeLogValue(item, key, seen));
  if (typeof value === "object" && value !== null)
    return sanitizeObject(value as Readonly<Record<string, unknown>>, seen);
  return undefined;
}

export function sanitizeLogFields(
  fields: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return sanitizeObject(fields, new WeakSet());
}
