import { describe, expect, it } from "vitest";
import {
  createPrivateSpeakingObjectKey,
  speakingRecordingPolicy,
  validateSpeakingRecordingMetadata,
} from "./recording-contract";

const validMetadata = {
  operationKey: "operation-123",
  attemptId: "attempt-123",
  activityId: "activity.a0.speaking",
  mimeType: "audio/webm;codecs=opus",
  byteLength: 24_000,
  durationMs: 8_000,
} as const;

describe("speaking recording contract", () => {
  it("accepts bounded metadata for an allowed audio format", () => {
    expect(validateSpeakingRecordingMetadata(validMetadata)).toEqual({
      ok: true,
      value: validMetadata,
    });
  });

  it.each([
    ["unsupported_mime_type", { ...validMetadata, mimeType: "audio/wav" }],
    [
      "recording_too_large",
      {
        ...validMetadata,
        byteLength: speakingRecordingPolicy.maxBytes + 1,
      },
    ],
    [
      "recording_too_long",
      {
        ...validMetadata,
        durationMs: speakingRecordingPolicy.maxDurationMs + 1,
      },
    ],
  ] as const)("rejects %s", (expectedCode, metadata) => {
    const result = validateSpeakingRecordingMetadata(metadata);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(expectedCode);
  });

  it("generates the private object key only from server-controlled opaque ids", () => {
    expect(
      createPrivateSpeakingObjectKey({
        userId: "user-1",
        attemptId: "attempt-1",
        assetId: "asset-1",
      }),
    ).toBe("speaking/user-1/attempt-1/asset-1");
  });

  it.each(["../escape", "user/other", " leading", "", "a".repeat(129)])(
    "rejects path-like or malformed ids: %s",
    (userId) => {
      expect(() =>
        createPrivateSpeakingObjectKey({
          userId,
          attemptId: "attempt-1",
          assetId: "asset-1",
        }),
      ).toThrow("userId is invalid");
    },
  );
});
