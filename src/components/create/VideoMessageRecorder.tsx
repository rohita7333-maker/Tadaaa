"use client";

import { useEffect, useRef, useState } from "react";
import { Video, Circle, Square, RotateCcw, Trash2, AlertCircle } from "lucide-react";

export interface RecordedVideo {
  blob: Blob;
  mimeType: string;
  ext: "webm" | "mp4";
  previewUrl: string;
  durationSec: number;
}

interface VideoMessageRecorderProps {
  video: RecordedVideo | null;
  onVideoChange: (video: RecordedVideo | null) => void;
}

const MAX_SECONDS = 60;

/** First supported MediaRecorder container — Safari records mp4, the rest webm. */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? null;
}

type Phase = "idle" | "starting" | "ready" | "recording" | "error";

/**
 * Optional face-to-camera message, recorded in the browser (MediaRecorder,
 * 60s cap) and played to the recipient right before the photos. The file
 * uploads at publish through the same signed-URL pending/ pipeline as photos.
 */
export default function VideoMessageRecorder({ video, onVideoChange }: VideoMessageRecorderProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // Camera off + timer cleared when the wizard step unmounts mid-session.
  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, []);

  async function startCamera() {
    setErrorMsg("");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      !pickMimeType()
    ) {
      setErrorMsg("Video recording isn't supported in this browser.");
      setPhase("error");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      setPhase("ready");
      // The <video> mounts on the state flip; attach on the next frame.
      requestAnimationFrame(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setErrorMsg(
        "Camera access was blocked. Allow camera and microphone in your browser settings, then try again."
      );
      setPhase("error");
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    const mimeType = pickMimeType();
    if (!stream || !mimeType) return;

    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    } catch {
      setErrorMsg("Recording couldn't start. Try a different browser.");
      setPhase("error");
      stopStream();
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      clearTimer();
      const blob = new Blob(chunks, { type: mimeType });
      const ext: "webm" | "mp4" = mimeType.includes("mp4") ? "mp4" : "webm";
      onVideoChange({
        blob,
        mimeType,
        ext,
        previewUrl: URL.createObjectURL(blob),
        durationSec: elapsedRef.current,
      });
      stopStream();
      setPhase("idle");
    };
    recorderRef.current = recorder;
    elapsedRef.current = 0;
    setElapsed(0);
    recorder.start();
    setPhase("recording");
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_SECONDS) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function discardAndRerecord() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    onVideoChange(null);
    startCamera();
  }

  function removeVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    onVideoChange(null);
    stopStream();
    setPhase("idle");
  }

  const secondsLeft = MAX_SECONDS - elapsed;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Video className="w-4 h-4 text-[#3E6B5C]" />
        <h3 className="font-heading text-lg text-[#1A1B18]">Video message</h3>
        <span className="text-[10px] font-semibold tracking-wide uppercase bg-[#3E6B5C] text-white rounded-full px-2 py-0.5">
          New
        </span>
      </div>
      <p className="text-sm text-[#6F6E68] mb-3">
        Say it to their face — up to 60 seconds, played right before the photos.
      </p>

      {/* Recorded — review, re-record or remove. */}
      {video ? (
        <div className="space-y-2">
          <video
            src={video.previewUrl}
            controls
            playsInline
            className="w-full aspect-video rounded-xl border border-[#E9E6DF] bg-black object-contain"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6F6E68]">
              {video.durationSec}s recorded · uploads when you publish
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={discardAndRerecord}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#E9E6DF] text-sm text-[#1A1B18] hover:border-[#3E6B5C] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-record
              </button>
              <button
                type="button"
                onClick={removeVideo}
                aria-label="Remove video message"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#E9E6DF] text-sm text-[#6F6E68] hover:border-[#B3261E] hover:text-[#B3261E] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </span>
          </div>
        </div>
      ) : phase === "idle" ? (
        <button
          type="button"
          onClick={startCamera}
          className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[#E9E6DF] px-3 py-3 text-left hover:border-[#3E6B5C] transition-colors"
        >
          <span className="w-8 h-8 rounded-full border border-[#E9E6DF] flex items-center justify-center text-[#3E6B5C] flex-shrink-0">
            <Video className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-[#1A1B18]">Record a video message</span>
            <span className="block text-xs text-[#6F6E68]">Optional — skip it and the reveal goes straight to photos.</span>
          </span>
        </button>
      ) : phase === "error" ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#E9E6DF] bg-[#FAF9F6] px-3 py-3">
          <AlertCircle className="w-4 h-4 text-[#B3261E] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-[#1A1B18]">{errorMsg}</p>
            <button
              type="button"
              onClick={startCamera}
              className="mt-2 text-sm font-semibold text-[#3E6B5C] hover:text-[#2E5145]"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <video
              ref={liveVideoRef}
              muted
              playsInline
              className="w-full aspect-video rounded-xl border border-[#E9E6DF] bg-black object-cover"
            />
            {phase === "recording" && (
              <span
                role="timer"
                aria-label={`${secondsLeft} seconds left`}
                className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white"
              >
                <span className="w-2 h-2 rounded-full bg-[#E5484D] animate-pulse" />
                0:{String(secondsLeft).padStart(2, "0")} left
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6F6E68]">
              {phase === "starting"
                ? "Starting camera…"
                : phase === "recording"
                  ? "Recording — stops automatically at 60s"
                  : "Camera is live. Nothing records until you press the button."}
            </span>
            {phase === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#1A1B18] text-sm font-semibold text-white hover:bg-black transition-colors"
              >
                <Square className="w-3 h-3 fill-white" />
                Stop
              </button>
            ) : phase === "ready" ? (
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={removeVideo}
                  className="h-9 px-3 rounded-full border border-[#E9E6DF] text-sm text-[#6F6E68] hover:border-[#6F6E68] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#B3261E] text-sm font-semibold text-white hover:bg-[#8F1E18] transition-colors"
                >
                  <Circle className="w-3 h-3 fill-white" />
                  Record
                </button>
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
