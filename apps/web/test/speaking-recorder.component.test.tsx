import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeakingRecorder } from "../app/app/speaking-recorder";

const originalMediaRecorder = window.MediaRecorder;
const originalMediaDevices = navigator.mediaDevices;

afterEach(() => {
  Object.defineProperty(window, "MediaRecorder", {
    configurable: true,
    value: originalMediaRecorder,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: originalMediaDevices,
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SpeakingRecorder", () => {
  it("offers an explicit fallback when browser recording is unavailable", async () => {
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });

    render(<SpeakingRecorder onRecordingReady={vi.fn()} />);

    expect(
      await screen.findByText(/não oferece gravação de áudio compatível/i),
    ).toBeInTheDocument();
  });

  it("handles denied microphone permission without crashing the activity", async () => {
    installFakeMediaRecorder();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new DOMException("denied", "NotAllowedError")),
      },
    });

    render(<SpeakingRecorder onRecordingReady={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Gravar resposta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /acesso ao microfone foi negado/i,
    );
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });

  it("returns a bounded blob after stop and releases the microphone", async () => {
    const trackStop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    installFakeMediaRecorder();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:recording-preview"),
      revokeObjectURL: vi.fn(),
    });
    const onRecordingReady = vi.fn();

    render(<SpeakingRecorder onRecordingReady={onRecordingReady} />);
    fireEvent.click(screen.getByRole("button", { name: "Gravar resposta" }));

    expect(
      await screen.findByRole("button", { name: "Parar gravação" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Parar gravação" }));

    await waitFor(() => expect(onRecordingReady).toHaveBeenCalledTimes(1));
    expect(onRecordingReady.mock.calls[0]?.[0]).toMatchObject({
      mimeType: "audio/webm",
    });
    expect(onRecordingReady.mock.calls[0]?.[0].blob).toBeInstanceOf(Blob);
    expect(onRecordingReady.mock.calls[0]?.[0].durationMs).toBeGreaterThan(0);
    expect(trackStop).toHaveBeenCalled();
    expect(
      screen.getByLabelText("Prévia da sua gravação"),
    ).toBeInTheDocument();
  });
});

function installFakeMediaRecorder(): void {
  class FakeMediaRecorder extends EventTarget {
    static isTypeSupported(mimeType: string): boolean {
      return mimeType === "audio/webm";
    }

    readonly mimeType: string;
    state: RecordingState = "inactive";

    constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
      super();
      this.mimeType = options?.mimeType ?? "audio/webm";
    }

    start(): void {
      this.state = "recording";
    }

    stop(): void {
      this.state = "inactive";
      const dataAvailable = new Event("dataavailable");
      Object.defineProperty(dataAvailable, "data", {
        value: new Blob(["synthetic-audio"], { type: this.mimeType }),
      });
      this.dispatchEvent(dataAvailable);
      this.dispatchEvent(new Event("stop"));
    }
  }

  Object.defineProperty(window, "MediaRecorder", {
    configurable: true,
    value: FakeMediaRecorder,
  });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
}
