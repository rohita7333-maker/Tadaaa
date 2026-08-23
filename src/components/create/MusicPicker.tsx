"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause } from "lucide-react";
import { MUSIC_TRACKS } from "@/lib/music";

interface MusicPickerProps {
  selected: string;
  onSelect: (trackId: string) => void;
}

/**
 * Reveal soundtrack picker. One shared <audio> element previews tracks so two
 * can never play at once; selection is just the track id (empty = no music).
 * Playback on the recipient side is tap-gated — browsers block autoplay — and
 * the copy below says so, honestly.
 */
export default function MusicPicker({ selected, onSelect }: MusicPickerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.55;
    audio.addEventListener("ended", () => setPlayingId(null));
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  function togglePreview(trackId: string, file: string) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId === trackId) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = file;
    audio.play().catch(() => setPlayingId(null));
    setPlayingId(trackId);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Music className="w-4 h-4 text-[#3E6B5C]" />
        <h3 className="font-heading text-lg text-[#1A1B18]">Music</h3>
        <span className="text-[10px] font-semibold tracking-wide uppercase bg-[#3E6B5C] text-white rounded-full px-2 py-0.5">
          New
        </span>
      </div>
      <p className="text-sm text-[#6F6E68] mb-3">
        Plays softly after their first tap — sound is always tap-gated, never
        autoplayed.
      </p>
      <div className="space-y-2">
        {MUSIC_TRACKS.map((track) => {
          const isSelected = selected === track.id;
          const isPlaying = playingId === track.id;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(isSelected ? "" : track.id)}
              aria-pressed={isSelected}
              className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? "border-[#3E6B5C] border-2 bg-[#E7EFEA]/40"
                  : "border-[#E9E6DF] hover:border-[#6F6E68]"
              }`}
            >
              <span
                role="button"
                tabIndex={0}
                aria-label={`${isPlaying ? "Pause" : "Preview"} ${track.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePreview(track.id, track.file);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePreview(track.id, track.file);
                  }
                }}
                className="w-8 h-8 rounded-full border border-[#E9E6DF] flex items-center justify-center text-[#3E6B5C] hover:border-[#3E6B5C] flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-[#1A1B18]">{track.name}</span>
                <span className="block text-xs text-[#6F6E68]">{track.description}</span>
              </span>
              {isSelected && (
                <span className="text-xs font-semibold text-[#2E5145]">On</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onSelect("")}
          aria-pressed={selected === ""}
          className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
            selected === ""
              ? "border-[#3E6B5C] border-2 bg-[#E7EFEA]/40"
              : "border-[#E9E6DF] hover:border-[#6F6E68]"
          }`}
        >
          <span className="w-8 h-8 rounded-full border border-[#E9E6DF] flex items-center justify-center text-[#6F6E68] flex-shrink-0 text-sm">
            —
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-[#1A1B18]">No music</span>
            <span className="block text-xs text-[#6F6E68]">Silence is also a choice.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
