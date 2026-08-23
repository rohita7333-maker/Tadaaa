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
        if (s === "ready") toast.success("Video ready!");
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
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/60">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Film className="w-4.5 h-4.5 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">AI Video</p>
            <p className="text-xs text-amber-700/70">Generate a video from your photos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Crown className="w-3.5 h-3.5 text-amber-600" />
          <p className="text-xs text-amber-700">Available on Plus and Unlimited plans</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E9E6DF]/30 shadow-[0_4px_24px_rgba(26, 27, 24,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
          <Film className="w-4.5 h-4.5 text-[#3E6B5C]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1B18]">AI Video</p>
          <p className="text-xs text-[#6F6E68]">Ken Burns slideshow with your photos & message</p>
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
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Film className="w-4 h-4" />
              Generate Video
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
              <Film className="w-5 h-5 text-[#3E6B5C]" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-[#1A1B18]">Generating your video...</p>
              <p className="text-xs text-[#6F6E68]">This may take 30–60 seconds</p>
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
              className="flex items-center gap-2 text-green-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-sm font-medium">Video ready!</p>
            </motion.div>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-xl border border-[#E9E6DF]/40"
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
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">Generation failed</p>
              <button
                onClick={handleGenerate}
                className="text-xs text-[#3E6B5C] hover:underline font-medium mt-1"
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
