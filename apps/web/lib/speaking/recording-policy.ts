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

export function isAllowedSpeakingMimeType(mimeType: string): boolean {
  return speakingRecordingPolicy.allowedMimeTypes.some(
    (allowedMimeType) => allowedMimeType === mimeType,
  );
}
