import { describe, expect, it } from "vitest";
import type { PrivateSpeakingStorage, SpeakingRecordingMetadata } from "./recording-contract";
import {
  uploadSpeakingRecording,
  type SpeakingRecordingReceipt,
  type SpeakingUploadLedger,
} from "./upload-recording";

const metadata: SpeakingRecordingMetadata = {
  operationKey: "operation-123",
  attemptId: "attempt-123",
  activityId: "activity.a0.speaking",
  mimeType: "audio/webm;codecs=opus",
  byteLength: 4,
  durationMs: 1_000,
};

class FakeLedger implements SpeakingUploadLedger {
  private state:
    | { kind: "reserved"; metadata: SpeakingRecordingMetadata; assetId: string }
    | { kind: "completed"; receipt: SpeakingRecordingReceipt }
    | undefined;

  async reserve(input: { userId: string; metadata: SpeakingRecordingMetadata }) {
    if (!this.state) {
      this.state = {
        kind: "reserved",
        metadata: input.metadata,
        assetId: "asset-server-1",
      };
      return { kind: "reserved" as const, assetId: "asset-server-1" };
    }
    if (this.state.kind === "reserved") return { kind: "in_progress" as const };
    return { kind: "completed" as const, receipt: this.state.receipt };
  }

  async complete(receipt: SpeakingRecordingReceipt) {
    this.state = { kind: "completed", receipt };
  }

  async release() {
    if (this.state?.kind === "reserved") this.state = undefined;
  }
}

function createStorage() {
  const puts: string[] = [];
  const deletes: string[] = [];
  const storage: PrivateSpeakingStorage = {
    async putPrivateObject(input) {
      puts.push(input.objectKey);
      return { assetRef: `private:${input.objectKey}` };
    },
    async deletePrivateObject(assetRef) {
      deletes.push(assetRef);
    },
  };
  return { storage, puts, deletes };
}

const ownedAttempt = {
  async belongsToUser() {
    return true;
  },
};

describe("speaking recording upload orchestration", () => {
  it("uploads once and replays the completed receipt for the same operation", async () => {
    const ledger = new FakeLedger();
    const { storage, puts } = createStorage();
    const input = { userId: "user-1", metadata, bytes: new Uint8Array(4) };

    const first = await uploadSpeakingRecording(input, {
      ownership: ownedAttempt,
      ledger,
      storage,
    });
    const second = await uploadSpeakingRecording(input, {
      ownership: ownedAttempt,
      ledger,
      storage,
    });

    expect(first.ok && first.replayed).toBe(false);
    expect(second.ok && second.replayed).toBe(true);
    expect(puts).toEqual(["speaking/user-1/attempt-123/asset-server-1"]);
    if (first.ok && second.ok) expect(second.receipt).toEqual(first.receipt);
  });

  it("rejects a reused operation key with different metadata", async () => {
    const ledger = new FakeLedger();
    const { storage, puts } = createStorage();
    const bytes = new Uint8Array(4);

    await uploadSpeakingRecording({ userId: "user-1", metadata, bytes }, {
      ownership: ownedAttempt,
      ledger,
      storage,
    });

    const conflict = await uploadSpeakingRecording(
      {
        userId: "user-1",
        metadata: { ...metadata, durationMs: metadata.durationMs + 1 },
        bytes,
      },
      { ownership: ownedAttempt, ledger, storage },
    );

    expect(conflict).toMatchObject({ ok: false, code: "operation_conflict" });
    expect(puts).toHaveLength(1);
  });

  it("checks authenticated ownership before reserving or uploading", async () => {
    const ledger = new FakeLedger();
    const { storage, puts } = createStorage();

    const result = await uploadSpeakingRecording(
      { userId: "user-1", metadata, bytes: new Uint8Array(4) },
      {
        ownership: { async belongsToUser() { return false; } },
        ledger,
        storage,
      },
    );

    expect(result).toMatchObject({ ok: false, code: "attempt_not_owned" });
    expect(puts).toHaveLength(0);
  });

  it("does not trust declared byte length when the payload differs", async () => {
    const ledger = new FakeLedger();
    const { storage, puts } = createStorage();

    const result = await uploadSpeakingRecording(
      { userId: "user-1", metadata, bytes: new Uint8Array(3) },
      { ownership: ownedAttempt, ledger, storage },
    );

    expect(result).toMatchObject({ ok: false, code: "byte_length_mismatch" });
    expect(puts).toHaveLength(0);
  });
});
