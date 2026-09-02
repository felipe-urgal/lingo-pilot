import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { noopTelemetryHooks } from "./contracts";
import { createLogger } from "./logger";
import { createRequestObserver } from "./request";
import { sanitizeLogFields } from "./sanitize";

describe("observability baseline", () => {
  it("redacts secrets, PII and free text while preserving operational fields", () => {
    expect(
      sanitizeLogFields({
        requestId: "req-123456",
        errorCode: "AUTH_UNAUTHORIZED",
        durationMs: 18,
        password: "secret-value",
        email: "learner@example.com",
        body: "free-form learner text",
        note: "unclassified free text",
      }),
    ).toEqual({
      requestId: "req-123456",
      errorCode: "AUTH_UNAUTHORIZED",
      durationMs: 18,
      password: "[redacted]",
      email: "[redacted]",
      body: "[redacted]",
      note: "[redacted-text]",
    });
  });

  it("emits structured records without leaking sensitive fields", () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: "test-service",
      environment: "test",
      version: "test-version",
      sink: (_level, line) => lines.push(line),
    });

    logger.info("request.completed", {
      requestId: "req-123456",
      result: "success",
      durationMs: 12,
      cookie: "session=secret",
    });

    const record = JSON.parse(lines[0] ?? "{}");
    expect(record.requestId).toBe("req-123456");
    expect(record.cookie).toBe("[redacted]");
    expect(record.message).toBe("request.completed");
  });

  it("returns a safe correlation id when an unexpected request error occurs", async () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: "test-service",
      environment: "test",
      version: "test-version",
      sink: (_level, line) => lines.push(line),
    });
    const observeRequest = createRequestObserver(logger, noopTelemetryHooks);
    const request = new NextRequest("http://localhost/api/test", {
      headers: { "x-request-id": "req-abcdefgh" },
    });

    const response = await observeRequest(
      request,
      { route: "/api/test", useCase: "test.failure" },
      () => {
        throw new Error("learner supplied secret text");
      },
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("req-abcdefgh");
    expect(await response.json()).toEqual({
      error: "internal_error",
      code: "INTERNAL_UNEXPECTED",
      requestId: "req-abcdefgh",
    });
    expect(lines.join("\n")).not.toContain("learner supplied secret text");
  });

  it("returns the request id header on successful responses", async () => {
    const logger = createLogger({
      service: "test-service",
      environment: "test",
      version: "test-version",
      sink: () => {},
    });
    const observeRequest = createRequestObserver(logger, noopTelemetryHooks);
    const request = new NextRequest("http://localhost/api/test", {
      headers: { "x-request-id": "req-success1" },
    });

    const response = await observeRequest(
      request,
      { route: "/api/test", useCase: "test.success" },
      () => NextResponse.json({ ok: true }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-success1");
  });
});
