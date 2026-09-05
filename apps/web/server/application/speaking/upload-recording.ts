import {
  createPrivateSpeakingObjectKey,
  type PrivateSpeakingStorage,
  type SpeakingRecordingMetadata,
  validateSpeakingRecordingMetadata,
} from "./recording-contract";

export type SpeakingRecordingReceipt = Readonly<{
  userId: string;
  operationKey: string;
  attemptId: string;
  activityId: string;
  assetId: string;
  assetRef: string;
  objectKey: string;
  mimeType: string;
  byteLength: number;
  durationMs: number;
}>;

export type SpeakingUploadReservation =
  | Readonly<{ kind: "reserved"; assetId: string }>
  | Readonly<{ kind: "in_progress" }>
  | Readonly<{ kind: "completed"; receipt: SpeakingRecordingReceipt }>;

/**
 * Persistence port for operation-level idempotency.
 *
 * `reserve` must be atomic for `(userId, operationKey)`. A production adapter
 * should enforce that uniqueness in the database rather than relying on an
 * in-process lock.
 */
export interface SpeakingUploadLedger {
  reserve(
    input: Readonly<{
      userId: string;
      metadata: SpeakingRecordingMetadata;
    }>,
  ): Promise<SpeakingUploadReservation>;
  complete(receipt: SpeakingRecordingReceipt): Promise<void>;
  release(
    input: Readonly<{ userId: string; operationKey: string }>,
  ): Promise<void>;
}

export interface SpeakingAttemptOwnership {
  belongsToUser(
    input: Readonly<{
      userId: string;
      attemptId: string;
      activityId: string;
    }>,
  ): Promise<boolean>;
}

export type SpeakingUploadErrorCode =
  | "invalid_metadata"
  | "byte_length_mismatch"
  | "attempt_not_owned"
  | "operation_conflict"
  | "upload_in_progress";

export type SpeakingUploadResult =
  | Readonly<{
      ok: true;
      replayed: boolean;
      receipt: SpeakingRecordingReceipt;
    }>
  | Readonly<{
      ok: false;
      code: SpeakingUploadErrorCode;
      message: string;
    }>;

export async function uploadSpeakingRecording(
  input: Readonly<{
    userId: string;
    metadata: SpeakingRecordingMetadata;
    bytes: Uint8Array;
  }>,
  dependencies: Readonly<{
    ownership: SpeakingAttemptOwnership;
    ledger: SpeakingUploadLedger;
    storage: PrivateSpeakingStorage;
  }>,
): Promise<SpeakingUploadResult> {
  const validation = validateSpeakingRecordingMetadata(input.metadata);
  if (!validation.ok) {
    return fail("invalid_metadata", validation.message);
  }

  if (input.bytes.byteLength !== validation.value.byteLength) {
    return fail(
      "byte_length_mismatch",
      "Recording byte length does not match the uploaded payload",
    );
  }

  const owned = await dependencies.ownership.belongsToUser({
    userId: input.userId,
    attemptId: validation.value.attemptId,
    activityId: validation.value.activityId,
  });
  if (!owned) {
    return fail(
      "attempt_not_owned",
      "Speaking attempt does not belong to the authenticated user",
    );
  }

  const reservation = await dependencies.ledger.reserve({
    userId: input.userId,
    metadata: validation.value,
  });

  if (reservation.kind === "in_progress") {
    return fail(
      "upload_in_progress",
      "An upload with this operation key is already in progress",
    );
  }

  if (reservation.kind === "completed") {
    if (!sameOperation(validation.value, reservation.receipt)) {
      return fail(
        "operation_conflict",
        "Operation key was already used with different recording metadata",
      );
    }
    return { ok: true, replayed: true, receipt: reservation.receipt };
  }

  let storedAssetRef: string | undefined;

  try {
    const objectKey = createPrivateSpeakingObjectKey({
      userId: input.userId,
      attemptId: validation.value.attemptId,
      assetId: reservation.assetId,
    });

    const stored = await dependencies.storage.putPrivateObject({
      objectKey,
      contentType: validation.value.mimeType,
      bytes: input.bytes,
    });
    storedAssetRef = stored.assetRef;

    const receipt: SpeakingRecordingReceipt = {
      userId: input.userId,
      operationKey: validation.value.operationKey,
      attemptId: validation.value.attemptId,
      activityId: validation.value.activityId,
      assetId: reservation.assetId,
      assetRef: stored.assetRef,
      objectKey,
      mimeType: validation.value.mimeType,
      byteLength: validation.value.byteLength,
      durationMs: validation.value.durationMs,
    };

    await dependencies.ledger.complete(receipt);
    return { ok: true, replayed: false, receipt };
  } catch (error) {
    if (storedAssetRef) {
      await dependencies.storage
        .deletePrivateObject(storedAssetRef)
        .catch(() => undefined);
    }
    await dependencies.ledger
      .release({
        userId: input.userId,
        operationKey: validation.value.operationKey,
      })
      .catch(() => undefined);
    throw error;
  }
}

function sameOperation(
  metadata: SpeakingRecordingMetadata,
  receipt: SpeakingRecordingReceipt,
): boolean {
  return (
    metadata.operationKey === receipt.operationKey &&
    metadata.attemptId === receipt.attemptId &&
    metadata.activityId === receipt.activityId &&
    metadata.mimeType === receipt.mimeType &&
    metadata.byteLength === receipt.byteLength &&
    metadata.durationMs === receipt.durationMs
  );
}

function fail(
  code: SpeakingUploadErrorCode,
  message: string,
): Extract<SpeakingUploadResult, { ok: false }> {
  return { ok: false, code, message };
}
