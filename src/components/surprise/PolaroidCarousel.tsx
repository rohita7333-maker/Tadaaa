"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { type Theme } from "@/lib/themes";
import { getReducedMotionTransition } from "@/lib/motion";

interface Photo {
  url: string;
  caption?: string;
  rotation_deg?: number;
}

interface Note {
  contributor_name: string;
  message: string;
}

interface PolaroidCarouselProps {
  photos: Photo[];
  /**
   * Retained for call-site compatibility. The mockup's photo scene
   * (`.s-photos`) is a paper ground, not a themed one, so the theme is not
   * painted here — it survives on the hero card and the message scene.
   */
  theme?: Theme;
  title: string;
  /**
   * Message-only contributions from collaborative invites (Task B2).
   * Photo contributions are merged into `photos` upstream; these letters-
   * without-an-image render after the photo grid so they aren't lost.
   */
  notes?: Note[];
  onComplete: () => void;
}

/** Mockup `transition-delay:${i*.35}s` on `.masonry .m`, capped so a large
 *  deck still finishes revealing in a couple of seconds. */
const STAGGER_S = 0.35;
const MAX_STAGGER_S = 2.45;

/**
 * Photo scene — mockup `.s-photos` / `.masonry` / `.mcap` (L457-463).
 *
 * A paper-ground masonry (2 columns, 3 above 800px) with mist-hairline tiles,
 * left-aligned captions on a paper strip, and the mockup's slow staggered
 * rise. Tapping a tile opens the mockup's `lightbox()`.
 */
export default function PolaroidCarousel({
  photos,
  title,
  notes = [],
  onComplete,
}: PolaroidCarouselProps) {
  const shouldReduce = useReducedMotion();
  const [showingNotes, setShowingNotes] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const hasNotes = notes.length > 0;
  const revealDone = shouldReduce
    ? 0
    : Math.min((photos.length - 1) * STAGGER_S, MAX_STAGGER_S) + 0.6;

  // Escape closes the lightbox — standard dismissal for an overlay.
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (showingNotes) {
    return (
      <div className="min-h-screen overflow-y-auto bg-paper px-7 pt-16 pb-28">
        <div className="mx-auto max-w-[440px] text-center">
          <p className="mb-1.5 font-heading text-[17px] italic text-stone">
            Notes from people who love you
          </p>
          <h2 className="mb-8 font-heading text-2xl text-ink">{title}</h2>

          <ul className="flex flex-col gap-2.5 text-left">
            {notes.map((n, i) => (
              <li
                key={`${n.contributor_name}-${i}`}
                className="rounded-[var(--r-md)] border border-mist bg-paper p-5 shadow-[var(--sh)]"
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                  {n.message}
                </p>
                <p className="mt-3 text-right text-[11px] uppercase tracking-[0.12em] text-stone">
                  {n.contributor_name}
                </p>
              </li>
            ))}
          </ul>

          <button type="button" onClick={onComplete} className="ed-btn ed-btn-coral mt-8">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-paper px-7 pt-16 pb-28 text-center">
      {/* Mockup `.cap2.serif-i` above the grid. */}
      <p className="mb-5 font-heading text-[17px] italic text-stone">A few favorites</p>

      {/* Mockup `.masonry` — CSS columns, not a grid, so tiles of different
          heights pack without gaps. */}
      <div className="mx-auto max-w-[440px] columns-2 gap-3 min-[800px]:max-w-[860px] min-[800px]:columns-3">
        {photos.map((photo, i) => (
          <motion.button
            key={`${photo.url}-${i}`}
            type="button"
            onClick={() => setLightbox(photo)}
            aria-label={photo.caption || `Open memory ${i + 1}`}
            className="mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-[var(--r-sm)] border border-mist bg-paper text-left focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduce
                ? { duration: 0.2 }
                : {
                    duration: 0.6,
                    ease: "easeOut",
                    delay: Math.min(i * STAGGER_S, MAX_STAGGER_S),
                  }
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Memory ${i + 1}`}
              className="block w-full"
              loading={i === 0 ? "eager" : "lazy"}
            />
            {photo.caption && (
              <span className="block border-t border-mist bg-paper px-[9px] py-1.5 text-[11px] text-stone">
                {photo.caption}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Continue arrives once the deck has finished revealing. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getReducedMotionTransition(shouldReduce, {
          duration: 0.4,
          delay: revealDone,
        })}
        className="mt-8"
      >
        <button
          type="button"
          onClick={() => (hasNotes ? setShowingNotes(true) : onComplete())}
          className="ed-btn ed-btn-coral"
        >
          {hasNotes ? "Read the notes" : "Continue"}
        </button>
      </motion.div>

      {/* Mockup `lightbox()` — full-bleed ink scrim, caption underneath. */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={lightbox.caption || "Memory"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-[rgba(26,26,26,0.94)] p-7"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              autoFocus
              className="absolute right-5 top-[14px] flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur-[6px] focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
              style={{ backgroundColor: "rgba(255,254,253,0.14)" }}
            >
              <X className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption || "Memory"}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[75vh] max-w-full rounded-[var(--r-sm)] object-contain"
            />
            {lightbox.caption && (
              <p className="max-w-[440px] text-[13px] text-sand">{lightbox.caption}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
