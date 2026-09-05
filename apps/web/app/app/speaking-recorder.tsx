"use client";

import { Button } from "@lingo-pilot/ui";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { speakingRecordingPolicy } from "../../lib/speaking/recording-policy";

export type SpeakingRecording = Readonly<{
  blob: Blob;
  mimeType: string;
  durationMs: number;
}>;

type RecorderState =
  "idle" | "requesting" | "recording" | "ready" | "unsupported" | "error";

type SpeakingRecorderProps = Readonly<{
  onRecordingReady: (recording: SpeakingRecording) => void;
}>;

export function SpeakingRecorder({ onRecordingReady }: SpeakingRecorderProps) {
  const isRecordingSupported = useSyncExternalStore(
    subscribeToRecordingCapability,
    supportsAudioRecording,
    getServerRecordingCapability,
  );
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardOnStopRef = useRef(false);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current !== null) clearTimeout(stopTimerRef.current);
      discardOnStopRef.current = true;
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      releaseStream(streamRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startRecording(): Promise<void> {
    if (!isRecordingSupported) {
      setState("unsupported");
      return;
    }

    clearPreview();
    setErrorMessage(undefined);
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectSupportedMimeType();
      if (!mimeType) {
        releaseStream(stream);
        setState("unsupported");
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardOnStopRef.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("error", () => {
        releaseStream(streamRef.current);
        setErrorMessage(
          "Não foi possível concluir a gravação. Tente novamente.",
        );
        setState("error");
      });
      recorder.addEventListener("stop", () => finishRecording(recorder));

      startedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
      stopTimerRef.current = setTimeout(
        () => stopRecording(),
        speakingRecordingPolicy.maxDurationMs,
      );
    } catch (error) {
      releaseStream(streamRef.current);
      const permissionDenied =
        error instanceof DOMException && error.name === "NotAllowedError";
      setErrorMessage(
        permissionDenied
          ? "O acesso ao microfone foi negado. Libere a permissão do navegador ou continue sem gravar."
          : "Não foi possível acessar o microfone. Verifique o dispositivo e tente novamente.",
      );
      setState("error");
    }
  }

  function stopRecording(): void {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  }

  function cancelRecording(): void {
    discardOnStopRef.current = true;
    if (stopTimerRef.current !== null) clearTimeout(stopTimerRef.current);
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }
    releaseStream(streamRef.current);
    chunksRef.current = [];
    setState("idle");
  }

  function finishRecording(recorder: MediaRecorder): void {
    if (stopTimerRef.current !== null) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    releaseStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;

    if (discardOnStopRef.current) {
      discardOnStopRef.current = false;
      chunksRef.current = [];
      setState("idle");
      return;
    }

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
    chunksRef.current = [];
    const durationMs = Math.min(
      speakingRecordingPolicy.maxDurationMs,
      Math.max(1, Date.now() - startedAtRef.current),
    );

    if (blob.size === 0) {
      setErrorMessage("A gravação ficou vazia. Tente novamente.");
      setState("error");
      return;
    }
    if (blob.size > speakingRecordingPolicy.maxBytes) {
      setErrorMessage(
        "A gravação excedeu o limite permitido. Grave uma resposta mais curta.",
      );
      setState("error");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(blob);
    setPreviewUrl(nextPreviewUrl);
    setState("ready");
    onRecordingReady({ blob, mimeType: recorder.mimeType, durationMs });
  }

  function clearPreview(): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
  }

  if (state === "unsupported" || !isRecordingSupported) {
    return (
      <div className="practice-feedback" role="status">
        Este navegador não oferece gravação de áudio compatível. Continue pela
        alternativa sem microfone desta atividade.
      </div>
    );
  }

  return (
    <section aria-labelledby="speaking-recorder-title">
      <h3 id="speaking-recorder-title">Gravar resposta</h3>
      <p className="description">
        O áudio só é preparado para envio depois que você encerra a gravação.
        Limite de 60 segundos.
      </p>

      {state === "requesting" ? (
        <p aria-live="polite" role="status">
          Solicitando acesso ao microfone…
        </p>
      ) : null}
      {state === "recording" ? (
        <p aria-live="polite" role="status">
          Gravando…
        </p>
      ) : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {state === "ready" && previewUrl ? (
        <audio aria-label="Prévia da sua gravação" controls src={previewUrl} />
      ) : null}

      {state === "idle" || state === "error" ? (
        <Button type="button" onClick={() => void startRecording()}>
          {state === "error" ? "Tentar novamente" : "Gravar resposta"}
        </Button>
      ) : null}
      {state === "requesting" ? (
        <Button disabled type="button">
          Aguardando permissão…
        </Button>
      ) : null}
      {state === "recording" ? (
        <>
          <Button type="button" onClick={stopRecording}>
            Parar gravação
          </Button>{" "}
          <Button type="button" variant="secondary" onClick={cancelRecording}>
            Cancelar
          </Button>
        </>
      ) : null}
      {state === "ready" ? (
        <>
          <Button type="button" onClick={() => void startRecording()}>
            Gravar novamente
          </Button>{" "}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              clearPreview();
              setState("idle");
            }}
          >
            Descartar
          </Button>
        </>
      ) : null}
    </section>
  );
}

function subscribeToRecordingCapability(): () => void {
  return () => {};
}

function getServerRecordingCapability(): boolean {
  return false;
}

function supportsAudioRecording(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder === "function"
  );
}

function selectSupportedMimeType(): string | undefined {
  return speakingRecordingPolicy.allowedMimeTypes.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
}

function releaseStream(stream?: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
