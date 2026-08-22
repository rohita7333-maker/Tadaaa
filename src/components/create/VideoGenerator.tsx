"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Film, CheckCircle2, AlertCircle, Crown } from "lucide-react";
import { toast } from "sonner";
import { springs, durations, easings, makeReducedMotionTransition } from "@/lib/motion";

interface VideoGeneratorProps {
  inviteId: string;
  tier: string;
  initialStatus?: string | null;
}

export default function VideoGenerator({ inviteId, tier, initialStatus }: VideoGeneratorProps) {
  const [status, setStatus] = useState<string>(initialStatus || "none");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const shouldReduce = useReducedMotion();

  const isPremium = tier === "plus" || tier === "unlimited";

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/video/status?inviteId=${inviteId}`);
      const data = await res.json();
      setStatus(data.status);
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      return data.status;
    } catch {
      return "none";
    }
  }, [inviteId]);

  useEffect(() => {
    if (status !== "processing") return;

    const interval = setInterval(async () => {
      const s = await pollStatus();
      if (s === "ready" || s === "failed") {
        clearInterval(interval);
        if (s === "ready") toast.success("Video ready.");
        if (s === "failed") toast.error("Video generation failed");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, pollStatus]);

  async function handleGenerate() {
    setGenerating(true);
    setStatus("processing");

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to start video generation");
        setStatus("none");
      }
    } catch {
      toast.error("Failed to start video generation");
      setStatus("none");
    } finally {
      setGenerating(false);
    }
  }

  const statusTransition = makeReducedMotionTransition(shouldReduce, {
    duration: durations.quick,
    ease: easings.entrance,
  });

  if (!isPremium) {
    return (
      <div className="rounded-[var(--r-md)] border border-mist bg-pebble p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-[var(--r-sm)] bg-paper border border-mist flex items-center justify-center">
            <Film className="w-4 h-4 text-ink" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Video message</p>
            <p className="text-[13px] text-stone">A slideshow built from your photos.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Crown className="w-3.5 h-3.5 text-coral-deep" />
          <p className="text-[13px] text-stone">Available on Plus and Unlimited plans.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-md)] border border-mist bg-paper p-5 shadow-[var(--sh-card)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-[var(--r-sm)] bg-pebble border border-mist flex items-center justify-center">
          <Film className="w-4 h-4 text-coral-deep" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Video message</p>
          <p className="text-[13px] text-stone">A slow pan across your photos, with your words.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === "none" && (
          <motion.div
            key="none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={statusTransition}
          >
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="ed-btn ed-btn-coral ed-btn-block"
            >
              <Film className="w-4 h-4" />
              Generate video
            </button>
          </motion.div>
        )}

        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={statusTransition}
            className="flex items-center gap-3 py-2"
          >
            <motion.div
              animate={shouldReduce ? {} : { scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: durations.slow, ease: "linear" }}
            >
              <Film className="w-5 h-5 text-coral-deep" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-ink">Generating your video…</p>
              <p className="text-[13px] text-stone">This takes 30–60 seconds.</p>
            </div>
          </motion.div>
        )}

        {status === "ready" && videoUrl && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={statusTransition}
            className="space-y-3"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className="flex items-center gap-2 text-success"
            >
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-sm font-medium text-success">Video ready.</p>
            </motion.div>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-[var(--r-sm)] border border-mist"
              style={{ maxHeight: 300 }}
            />
          </motion.div>
        )}

        {status === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={statusTransition}
            className="flex items-center gap-3 py-2"
          >
            <AlertCircle className="w-5 h-5 text-coral-deep" />
            <div>
              <p className="text-sm font-medium text-ink">Generation failed.</p>
              <button
                onClick={handleGenerate}
                className="ed-tlink mt-1 text-[13px]"
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
