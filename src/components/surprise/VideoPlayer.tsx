"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, AlertCircle, SkipForward } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  onComplete?: () => void;
}

export default function VideoPlayer({ videoUrl, onComplete }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-white/80" />
          </div>
          <h2 className="text-white text-xl font-heading mb-2">
            Couldn&apos;t play this video
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Your connection may be unstable. You can skip ahead and still see
            the surprise.
          </p>
          <button
            onClick={() => onComplete?.()}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-[#2D2926] text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip ahead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {!playing ? (
        <motion.button
          onClick={() => setPlaying(true)}
          className="flex flex-col items-center gap-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring" }}
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
          <p className="text-white/70 text-sm">Tap to play your surprise</p>
        </motion.button>
      ) : (
        <>
          <video
            src={videoUrl}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            onEnded={onComplete}
            onError={(e) => {
              console.error("[VideoPlayer] playback failed:", e);
              setErrored(true);
            }}
          />
          {/* Skip — escape hatch even when the video stalls without erroring. */}
          <button
            onClick={() => onComplete?.()}
            aria-label="Skip video"
            className="absolute bottom-6 right-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/25 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        </>
      )}
    </div>
  );
}
