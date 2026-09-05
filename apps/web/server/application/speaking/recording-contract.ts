export const speakingRecordingPolicy = Object.freeze({
  maxDurationMs: 60_000,
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: [
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/ogg",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ] as const,
});

export type SpeakingRecordingMetadata = Readonly<{
  operationKey: string;
  attemptId: string;
  activityId: string;
  mimeType: string;
  byteLength: number;
  durationMs: number;
}>;

export type SpeakingRecordingValidationErrorCode =
  | "invalid_operation_key"
  | "invalid_attempt_id"
  | "invalid_activity_id"
  | "unsupported_mime_type"
  | "invalid_byte_length"
  | "recording_too_large"
  | "invalid_duration"
  | "recording_too_long";

export type SpeakingRecordingValidationResult =
  | Readonly<{ ok: true; value: SpeakingRecordingMetadata }>
  | Readonly<{
      ok: false;
      code: SpeakingRecordingValidationErrorCode;
      message: string;
    }>;

export type PrivateSpeakingObject = Readonly<{
  objectKey: string;
  contentType: string;
  bytes: Uint8Array;
}>;

export interface PrivateSpeakingStorage {
  putPrivateObject(
    input: PrivateSpeakingObject,
  ): Promise<Readonly<{ assetRef: string }>>;
  deletePrivateObject(assetRef: string): Promise<void>;
}

export function validateSpeakingRecordingMetadata(
  input: SpeakingRecordingMetadata,
): SpeakingRecordingValidationResult {
  if (!isOpaqueId(input.operationKey)) {
    return invalid("invalid_operation_key", "Operation key is invalid");
  }
  if (!isOpaqueId(input.attemptId)) {
    return invalid("invalid_attempt_id", "Attempt id is invalid");
  }
  if (!isOpaqueId(input.activityId)) {
    return invalid("invalid_activity_id", "Activity id is invalid");
  }
  if (
    !speakingRecordingPolicy.allowedMimeTypes.some(
      (allowedMimeType) => allowedMimeType === input.mimeType,
    )
  ) {
    return invalid("unsupported_mime_type", "Recording MIME type is not allowed");
  }
  if (!Number.isInteger(input.byteLength) || input.byteLength <= 0) {
    return invalid("invalid_byte_length", "Recording byte length is invalid");
  }
  if (input.byteLength > speakingRecordingPolicy.maxBytes) {
    return invalid("recording_too_large", "Recording exceeds maximum size");
  }
  if (!Number.isInteger(input.durationMs) || input.durationMs <= 0) {
    return invalid("invalid_duration", "Recording duration is invalid");
  }
  if (input.durationMs > speakingRecordingPolicy.maxDurationMs) {
    return invalid("recording_too_long", "Recording exceeds maximum duration");
  }

  return { ok: true, value: input };
}

export function createPrivateSpeakingObjectKey(input: Readonly<{
  userId: string;
  attemptId: string;
  assetId: string;
}>): string {
  for (const [name, value] of Object.entries(input)) {
    if (!isOpaqueId(value)) throw new Error(`${name} is invalid`);
  }

  return `speaking/${input.userId}/${input.attemptId}/${input.assetId}`;
}

function isOpaqueId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

function invalid(
  code: SpeakingRecordingValidationErrorCode,
  message: string,
): SpeakingRecordingValidationResult {
  return { ok: false, code, message };
}
