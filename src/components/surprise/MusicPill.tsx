"use client";

import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

interface MusicPillProps {
  file: string;
  name: string;
}

/**
 * Reveal soundtrack. Browsers block autoplay, so playback is armed and starts
 * on the recipient's first tap/keypress — which the reveal mechanics already
 * demand — then loops until muted with the pill.
 */
export default function MusicPill({ file, name }: MusicPillProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const audio = new Audio(file);
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    const start = () => {
      audio.play().then(() => {
        setStarted(true);
        setPlaying(true);
      }).catch(() => {
        // Autoplay policy said no even with a gesture — leave the pill armed.
      });
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });

    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      audio.pause();
      audio.src = "";
    };
  }, [file]);

  function toggle(e: React.MouseEvent) {
    // The window-level starter must not re-fire off this same tap.
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => {
        setStarted(true);
        setPlaying(true);
      }).catch(() => {});
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={playing}
      aria-label={playing ? `Mute music: ${name}` : `Play music: ${name}`}
      className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/60 transition-colors"
    >
      {playing ? (
        <Music className="w-3.5 h-3.5" />
      ) : (
        <VolumeX className="w-3.5 h-3.5" />
      )}
      <span>{started ? name : "Tap for music"}</span>
    </button>
  );
}
