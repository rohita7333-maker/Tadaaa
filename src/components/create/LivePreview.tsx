"use client";

import { useState } from "react";
import { Eye, X, Music } from "lucide-react";
import { getThemeById } from "@/lib/themes";
import { getTrackById } from "@/lib/music";
import type { PhotoFile } from "@/components/create/PhotoUploader";
import type { RevealStyle } from "@/lib/templates";

interface LivePreviewProps {
  title: string;
  message: string;
  occasionType: string;
  themeId: string;
  revealType: RevealStyle;
  photos: PhotoFile[];
  musicTrack: string;
}

const REVEAL_LABEL: Record<string, string> = {
  tap: "Tap to open",
  countdown: "Countdown",
  scroll_story: "Scroll story",
};

// Humanize an occasion id for the eyebrow; unknown/custom ids read warmly.
function occasionLabel(id: string): string {
  if (!id || id === "custom") return "For you";
  return id.replace(/_/g, " ");
}

/**
 * Live phone preview beside the wizard. Pure client render off wizard state —
 * no uploads, no network. Photo thumbs reuse PhotoUploader's object URLs.
 */
export function LivePreviewPhone({
  title,
  message,
  occasionType,
  themeId,
  revealType,
  photos,
  musicTrack,
}: LivePreviewProps) {
  const theme = getThemeById(themeId);
  const track = getTrackById(musicTrack);
  const first = photos[0];

  return (
    <div className="w-full max-w-[280px] mx-auto">
      <div
        className="relative aspect-[9/17.5] rounded-[32px] bg-white p-2.5"
        style={{ boxShadow: "0 18px 44px rgba(26,27,24, 0.16), 0 0 0 1px #E9E6DF" }}
      >
        <div
          className="h-full w-full rounded-[24px] overflow-hidden flex flex-col items-center justify-center text-center px-5 py-6 relative"
          style={{ background: theme?.colors.background ?? "#1A1B18" }}
        >
          {track && (
            <span
              className="absolute top-3 right-3 flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-semibold tracking-wide uppercase"
              style={{
                color: theme?.colors.text ?? "#fff",
                borderColor: "rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.18)",
              }}
            >
              <Music className="w-2.5 h-2.5" />
              {track.name}
            </span>
          )}
          <span
            className="text-[9px] font-semibold tracking-[0.2em] uppercase opacity-80"
            style={{ color: theme?.colors.text ?? "#fff" }}
          >
            {occasionLabel(occasionType)}
          </span>
          <h3
            className="font-heading text-xl leading-tight mt-2 break-words max-w-full"
            style={{ color: theme?.colors.text ?? "#fff" }}
          >
            {title.trim() || "Their surprise title"}
          </h3>
          {first ? (
            <figure
              className="bg-white rounded-md p-1.5 pb-2 mt-4 w-[140px] shadow-lg"
              style={{ transform: `rotate(${first.rotation_deg || -3}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={first.preview}
                alt=""
                className="w-full aspect-[4/3] object-cover rounded-sm"
              />
              {first.caption && (
                <figcaption className="text-[9px] text-[#6F6E68] pt-1 text-left truncate">
                  {first.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="mt-4 w-[140px] aspect-[4/3] rounded-md border border-dashed border-white/40 flex items-center justify-center text-[9px] opacity-70"
              style={{ color: theme?.colors.text ?? "#fff" }}
            >
              photos land here
            </div>
          )}
          <p
            className="text-[11px] leading-relaxed mt-4 max-w-[200px] opacity-90 line-clamp-3"
            style={{ color: theme?.colors.text ?? "#fff" }}
          >
            {message.trim() || "Your message shows here as you type it."}
          </p>
          <span
            className="absolute bottom-4 left-0 right-0 text-[8px] tracking-[0.18em] uppercase opacity-70"
            style={{ color: theme?.colors.text ?? "#fff" }}
          >
            {REVEAL_LABEL[revealType] ?? "Tap to open"}
            {photos.length > 1 ? ` · ${photos.length} photos` : ""}
          </span>
        </div>
      </div>
      <p className="text-center text-xs text-[#6F6E68] mt-3 leading-relaxed">
        Live preview — updates as you type.
        <br />
        Nothing uploads until you publish.
      </p>
    </div>
  );
}

/**
 * Floating preview affordance for viewports without room for the side column.
 * A pill toggles a full overlay carrying the same phone.
 */
export function LivePreviewOverlay(props: LivePreviewProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#1A1B18] text-white text-sm font-semibold px-4 py-3 shadow-lg"
        aria-label="Open live preview"
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-[#1A1B18]/60 backdrop-blur-sm flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Live preview"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white border border-[#E9E6DF] flex items-center justify-center text-[#1A1B18] shadow"
            >
              <X className="w-4 h-4" />
            </button>
            <LivePreviewPhone {...props} />
          </div>
        </div>
      )}
    </div>
  );
}
