"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Loader2, CheckCircle2, AlertCircle, Crown } from "lucide-react";
import { toast } from "sonner";

interface VideoGeneratorProps {
  inviteId: string;
  tier: string;
  initialStatus?: string | null;
}

export default function VideoGenerator({ inviteId, tier, initialStatus }: VideoGeneratorProps) {
  const [status, setStatus] = useState<string>(initialStatus || "none");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
    <div className="bg-white rounded-2xl p-5 border border-[#D4CBC3]/30 shadow-[0_4px_24px_rgba(45,41,38,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
          <Film className="w-4.5 h-4.5 text-[#C4686D]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#2D2926]">AI Video</p>
          <p className="text-xs text-[#6B5E57]">Ken Burns slideshow with your photos & message</p>
        </div>
      </div>

      {status === "none" && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Film className="w-4 h-4" />
          )}
          Generate Video
        </button>
      )}

      {status === "processing" && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-5 h-5 text-[#C4686D] animate-spin" />
          <div>
            <p className="text-sm font-medium text-[#2D2926]">Generating your video...</p>
            <p className="text-xs text-[#6B5E57]">This may take 30-60 seconds</p>
          </div>
        </div>
      )}

      {status === "ready" && videoUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-sm font-medium">Video ready!</p>
          </div>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl border border-[#D4CBC3]/40"
            style={{ maxHeight: 300 }}
          />
        </div>
      )}

      {status === "failed" && (
        <div className="flex items-center gap-3 py-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700">Generation failed</p>
            <button
              onClick={handleGenerate}
              className="text-xs text-[#C4686D] hover:underline font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
