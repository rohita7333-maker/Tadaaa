"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Theme } from "@/lib/themes";

interface Photo {
  url: string;
  caption?: string;
  rotation_deg?: number;
}

interface Note {
  contributor_name: string;
  message: string;
}

interface CirclePolaroidCarouselProps {
  photos: Photo[];
  theme: Theme;
  title: string;
  /** Message-only contributions, shown after the photo deck. */
  notes?: Note[];
  onComplete: () => void;
}

/** Deterministic tilts so the polaroids feel hand-placed, not generated. */
const TILTS = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];

/** Photo blooms open from its dot; the frame and caption settle in after. */
const BLOOM_SECONDS = 0.72;
const BLOOM_EASE = [0.76, 0, 0.24, 1] as const;

/**
 * The photo stage of the reveal: every memory waits as a small circle along
 * the bottom, then blooms open into a captioned polaroid.
 *
 * Deliberately CSS/`clip-path` via framer-motion rather than GSAP — the app
 * already ships framer-motion, and the Content-Security-Policy has no CDN
 * allowance, so a runtime-injected animation library would die in production.
 *
 * Keeps the contract of the polaroid carousel it replaces: it tracks which
 * photos have been seen, gates Continue until they all have, and hands off to
 * `onComplete` (via the notes stage when there are contributor letters).
 */
export default function CirclePolaroidCarousel({
  photos,
  theme,
  title,
  notes = [],
  onComplete,
}: CirclePolaroidCarouselProps) {
  const shouldReduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [showingNotes, setShowingNotes] = useState(false);

  const hasNotes = notes.length > 0;
  const total = photos.length;
  const textColor = theme.colors.text;
  const accent = theme.colors.accent;
  const allViewed = useMemo(() => seen.size >= total, [seen, total]);

  // Nothing to show at all — don't strand the guest on an empty stage.
  useEffect(() => {
    if (total === 0 && !hasNotes) onComplete();
  }, [total, hasNotes, onComplete]);

  const goTo = useCallback((next: number) => {
    setActiveIndex(next);
    setSeen((prev) => {
      if (prev.has(next)) return prev;
      const grown = new Set(prev);
      grown.add(next);
      return grown;
    });
  }, []);

  const handlePrev = useCallback(() => {
    if (total > 0) goTo((activeIndex - 1 + total) % total);
  }, [activeIndex, total, goTo]);

  const handleNext = useCallback(() => {
    if (total > 0) goTo((activeIndex + 1) % total);
  }, [activeIndex, total, goTo]);

  const handleContinue = useCallback(() => {
    if (hasNotes && !showingNotes) {
      setShowingNotes(true);
      return;
    }
    onComplete();
  }, [hasNotes, showingNotes, onComplete]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showingNotes) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onComplete(); }
        return;
      }
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if ((e.key === "Enter" || e.key === " ") && allViewed) {
        e.preventDefault();
        handleContinue();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext, handleContinue, allViewed, showingNotes, onComplete]);

  // ── Notes stage — same treatment as the carousel this replaces ────────────
  if (showingNotes) {
    return (
      <button
        type="button"
        onClick={onComplete}
        aria-label="Continue to next part of the surprise"
        className="w-full min-h-screen flex flex-col items-center justify-between px-6 py-8 cursor-pointer focus:outline-none"
        style={{ background: theme.colors.background }}
      >
        <div className="w-full max-w-sm text-center pt-4">
          <p className="text-xs font-medium opacity-70 uppercase tracking-wider" style={{ color: textColor }}>
            Notes from people who love you
          </p>
          <h1 className="font-heading text-2xl mt-2" style={{ color: textColor }}>{title}</h1>
        </div>
        <div className="flex-1 w-full max-w-sm flex items-center justify-center py-6">
          <div className="w-full space-y-4">
            {notes.map((n, i) => (
              <div key={`n-${i}`} className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_rgba(26,27,24,0.16)]">
                <p
                  className="text-[#1A1B18] leading-relaxed"
                  style={{ fontFamily: "var(--font-caveat, cursive)", fontSize: "1.15rem", whiteSpace: "pre-wrap" }}
                >
                  {n.message}
                </p>
                <p className="mt-3 text-right text-xs text-[#6F6E68]">— {n.contributor_name}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-60 pb-2" style={{ color: textColor }}>Tap to continue</p>
      </button>
    );
  }

  if (total === 0) return null;

  const active = photos[activeIndex];
  const tilt = active.rotation_deg ?? TILTS[activeIndex % TILTS.length];

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-between px-6 py-5"
      style={{ background: theme.colors.background }}
    >
      <div className="w-full max-w-sm text-center pt-4">
        <p className="text-xs font-medium opacity-70 uppercase tracking-wider" style={{ color: textColor }}>
          A memory for you
        </p>
        <h1 className="font-heading text-2xl mt-2" style={{ color: textColor }}>{title}</h1>
      </div>

      {/* Stage — the polaroid, with the photo blooming open inside its frame. */}
      <div className="flex-1 w-full max-w-sm flex items-center justify-center py-4 min-h-0">
        <AnimatePresence mode="wait">
          <motion.figure
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.96, rotate: tilt }}
            animate={{ opacity: 1, scale: 1, rotate: tilt }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: shouldReduce ? 0 : 0.28 }}
            className="bg-white rounded-[4px] p-3 pb-0 shadow-[0_18px_44px_rgba(26,27,24,0.28)] w-full"
          >
            <div className="relative w-full aspect-square overflow-hidden bg-[#0d0f0d]">
              <motion.img
                src={active.url}
                alt={active.caption || `Memory ${activeIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={
                  shouldReduce
                    ? { clipPath: "circle(75% at 50% 50%)" }
                    : { clipPath: "circle(7% at 50% 96%)" }
                }
                animate={{ clipPath: "circle(75% at 50% 50%)" }}
                transition={{ duration: shouldReduce ? 0 : BLOOM_SECONDS, ease: BLOOM_EASE }}
              />
            </div>
            <figcaption
              className="text-center text-[#1A1B18] py-4 px-2 min-h-[3.5rem] flex items-center justify-center"
              style={{ fontFamily: "var(--font-caveat, cursive)", fontSize: "1.15rem" }}
            >
              {active.caption || " "}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      {/* Dots — each memory waiting as a circle, the way it arrived. */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={total < 2}
            aria-label="Previous photo"
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: `${accent}22`, color: textColor }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5" role="tablist" aria-label="Photos">
            {photos.map((p, i) => (
              <button
                key={`${p.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={p.caption ? `Photo ${i + 1}: ${p.caption}` : `Photo ${i + 1}`}
                onClick={() => goTo(i)}
                className="w-5 h-5 rounded-full bg-cover bg-center transition-transform"
                style={{
                  backgroundImage: `url(${p.url})`,
                  outline: i === activeIndex ? `2px solid ${textColor}` : `1.5px solid ${textColor}55`,
                  outlineOffset: "2px",
                  transform: i === activeIndex ? "scale(1.25)" : "scale(1)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={total < 2}
            aria-label="Next photo"
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: `${accent}22`, color: textColor }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-xs opacity-60 mb-2" style={{ color: textColor }}>
          {activeIndex + 1} of {total}
        </p>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!allViewed}
          className="w-full h-12 rounded-full font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ background: accent }}
        >
          {allViewed ? "Continue" : `Look at all ${total} first`}
        </button>
      </div>
    </div>
  );
}
