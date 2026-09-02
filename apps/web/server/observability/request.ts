import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Logger, TelemetryHooks } from "./contracts";
import {
  errorCodes,
  getErrorName,
  getSafeHttpError,
  type ErrorCode,
} from "./errors";

const requestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export type RequestObservabilityContext = Readonly<{
  requestId: string;
  logger: Logger;
}>;

export type RequestMetadata = Readonly<{
  route: string;
  useCase: string;
}>;

type RequestHandler = (
  context: RequestObservabilityContext,
) => Promise<NextResponse> | NextResponse;

export function resolveRequestId(request: NextRequest): string {
  const candidate = request.headers.get("x-request-id")?.trim();
  return candidate && requestIdPattern.test(candidate) ? candidate : randomUUID();
}

export function createErrorResponse(
  code: ErrorCode,
  requestId: string,
): NextResponse {
  const error = getSafeHttpError(code);
  return NextResponse.json(
    { error: error.legacyError, code: error.code, requestId },
    {
      status: error.status,
      headers: { "x-request-id": requestId },
    },
  );
}

export function createRequestObserver(
  logger: Logger,
  telemetry: TelemetryHooks,
) {
  return async function observeRequest(
    request: NextRequest,
    metadata: RequestMetadata,
    handler: RequestHandler,
  ): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = resolveRequestId(request);
    const requestLogger = logger.child({
      requestId,
      route: metadata.route,
      method: request.method,
      useCase: metadata.useCase,
    });
    const span = telemetry.startSpan(metadata.useCase, {
      route: metadata.route,
    });

    try {
      const response = await handler({ requestId, logger: requestLogger });
      const durationMs = Date.now() - startedAt;
      response.headers.set("x-request-id", requestId);
      recordCompletion(
        requestLogger,
        telemetry,
        span,
        response.status,
        durationMs,
      );
      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      recordUnexpectedFailure(
        requestLogger,
        telemetry,
        span,
        error,
        durationMs,
      );
      return createErrorResponse(errorCodes.internalUnexpected, requestId);
    }
  };
}

function recordCompletion(
  logger: Logger,
  telemetry: TelemetryHooks,
  span: ReturnType<TelemetryHooks["startSpan"]>,
  statusCode: number,
  durationMs: number,
): void {
  const result =
    statusCode >= 500 ? "error" : statusCode >= 400 ? "rejected" : "success";
  logger.info("request.completed", { durationMs, result, statusCode });
  telemetry.recordMetric({
    name: "http.request.count",
    value: 1,
    unit: "count",
    attributes: { result },
  });
  telemetry.recordMetric({
    name: "http.request.duration",
    value: durationMs,
    unit: "milliseconds",
    attributes: { result },
  });
  span.end({ durationMs, result, statusCode });
}

function recordUnexpectedFailure(
  logger: Logger,
  telemetry: TelemetryHooks,
  span: ReturnType<TelemetryHooks["startSpan"]>,
  error: unknown,
  durationMs: number,
): void {
  const errorCode = errorCodes.internalUnexpected;
  logger.error("request.failed", {
    durationMs,
    errorCode,
    errorName: getErrorName(error),
    result: "error",
  });
  telemetry.recordMetric({
    name: "http.request.count",
    value: 1,
    unit: "count",
    attributes: { result: "error" },
  });
  telemetry.recordMetric({
    name: "http.request.duration",
    value: durationMs,
    unit: "milliseconds",
    attributes: { result: "error" },
  });
  span.end({ durationMs, errorCode, result: "error" });
}
