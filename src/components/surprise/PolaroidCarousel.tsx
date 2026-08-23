"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { type Theme } from "@/lib/themes";
import { getReducedMotionTransition, cssEasings } from "@/lib/motion";

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
  theme: Theme;
  title: string;
  /**
   * Message-only contributions from collaborative invites (Task B2).
   * Photo contributions are merged into `photos` upstream; these letters-
   * without-an-image render after the photo deck so they aren't lost.
   */
  notes?: Note[];
  onComplete: () => void;
}

// Deterministic tilts so polaroids feel hand-placed — matches PolaroidScroll.
const TILTS = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];

// Sparkle burst positions when user views the last photo.
const SPARKLES = [
  { x: -120, y: -90, delay: 0 },
  { x: 110, y: -110, delay: 0.05 },
  { x: -90, y: 80, delay: 0.1 },
  { x: 130, y: 60, delay: 0.15 },
  { x: 0, y: -140, delay: 0.2 },
  { x: -150, y: 0, delay: 0.25 },
  { x: 150, y: -20, delay: 0.3 },
  { x: 20, y: 130, delay: 0.35 },
];

export default function PolaroidCarousel({
  photos,
  theme,
  title,
  notes = [],
  onComplete,
}: PolaroidCarouselProps) {
  const shouldReduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [showingNotes, setShowingNotes] = useState(false);

  const hasNotes = notes.length > 0;
  const total = photos.length;
  const accent = theme.colors.accent;
  const textColor = theme.colors.text;

  const allViewed = useMemo(() => seen.size >= total, [seen, total]);
  const isLastPhotoActive = total > 0 && activeIndex === total - 1;
  const showSparkles = isLastPhotoActive && allViewed && !shouldReduce && !showingNotes;

  // Auto-fire onComplete if there's literally nothing to show.
  useEffect(() => {
    if (total === 0 && !hasNotes) onComplete();
  }, [total, hasNotes, onComplete]);

  const markSeen = useCallback((i: number) => {
    setSeen((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (total === 0) return;
      const wrapped = ((i % total) + total) % total;
      setActiveIndex(wrapped);
      markSeen(wrapped);
    },
    [total, markSeen]
  );

  const handlePrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const handleNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  const handleContinue = useCallback(() => {
    if (hasNotes && !showingNotes) {
      setShowingNotes(true);
      return;
    }
    onComplete();
  }, [hasNotes, showingNotes, onComplete]);

  // Keyboard nav: ←/→ to cycle, Enter/Space to advance once all viewed.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showingNotes) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onComplete();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if ((e.key === "Enter" || e.key === " ") && allViewed) {
        e.preventDefault();
        handleContinue();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext, handleContinue, allViewed, showingNotes, onComplete]);

  if (total === 0 && !hasNotes) return null;

  // ── Notes screen — unchanged treatment from PolaroidScroll ────────────────
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
          <p
            className="text-xs font-medium opacity-70 uppercase tracking-wider"
            style={{ color: textColor }}
          >
            Notes from people who love you
          </p>
          <h1 className="font-heading text-2xl mt-2" style={{ color: textColor }}>
            {title}
          </h1>
        </div>
        <div className="flex-1 w-full max-w-sm flex items-center justify-center py-6">
          <div className="w-full space-y-4">
            {notes.map((n, i) => (
              <div
                key={`n-${i}`}
                className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_rgba(26, 27, 24,0.16)]"
              >
                <p
                  className="text-[#1A1B18] leading-relaxed"
                  style={{
                    fontFamily: "var(--font-caveat, cursive)",
                    fontSize: "1.15rem",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.message}
                </p>
                <p className="mt-3 text-right text-xs text-[#6F6E68]">
                  — {n.contributor_name}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-sm text-center pb-4">
          <div
            className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full"
            style={{ background: `${accent}18`, color: accent }}
          >
            Tap to continue
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </button>
    );
  }

  // ── Photo carousel screen ─────────────────────────────────────────────────
  const activePhoto = photos[activeIndex];

  // Side-stack indices. Hide siblings if only 1 photo; if 2, prev === next so
  // the second card peeks from one side only (handled by isNext check below).
  const prevIndex = total > 1 ? (activeIndex - 1 + total) % total : -1;
  const nextIndex = total > 1 ? (activeIndex + 1) % total : -1;

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-between px-6 py-8"
      style={{ background: theme.colors.background }}
    >
      {/* Header */}
      <div className="w-full max-w-sm text-center pt-4">
        <p
          className="text-xs font-medium opacity-70 uppercase tracking-wider"
          style={{ color: textColor }}
        >
          A memory for you
        </p>
        <h1 className="font-heading text-2xl mt-2" style={{ color: textColor }}>
          {title}
        </h1>
        {total > 1 && (
          <div className="flex justify-center gap-1.5 mt-4" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? "20px" : "6px",
                  background: seen.has(i) ? accent : `${accent}33`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3D circular stack */}
      <div
        className="relative w-full max-w-md flex items-center justify-center"
        style={{
          height: "580px",
          perspective: "1500px",
        }}
      >
        {/* Sparkle burst when user lands on last photo after seeing all */}
        {showSparkles && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 30 }}
          >
            {SPARKLES.map((s, i) => (
              <motion.span
                key={`spark-${i}`}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: s.x,
                  y: s.y,
                  scale: [0.4, 1.1, 0.8],
                }}
                transition={{ duration: 1.4, delay: s.delay, ease: "easeOut" }}
                className="absolute"
              >
                <Sparkles className="w-4 h-4" style={{ color: accent }} />
              </motion.span>
            ))}
          </div>
        )}

        {photos.map((photo, i) => {
          const isActive = i === activeIndex;
          const isPrev = i === prevIndex && prevIndex !== activeIndex;
          const isNext = i === nextIndex && nextIndex !== activeIndex && nextIndex !== prevIndex;

          const tilt =
            photo.rotation_deg !== undefined && photo.rotation_deg !== 0
              ? photo.rotation_deg
              : TILTS[i % TILTS.length];

          let transform: string;
          let zIndex: number;
          let opacity: number;
          let onClick: (() => void) | undefined;
          let role: "button" | undefined;
          let ariaLabel: string | undefined;

          if (isActive) {
            transform = `translateX(0px) translateY(0px) scale(1) rotateY(0deg) rotate(${tilt}deg)`;
            zIndex = 3;
            opacity = 1;
          } else if (isPrev) {
            transform = shouldReduce
              ? `translateX(0px) translateY(0px) scale(1) rotate(${tilt}deg)`
              : `translateX(-170px) translateY(-30px) scale(0.74) rotateY(22deg) rotate(${tilt}deg)`;
            zIndex = 2;
            opacity = shouldReduce ? 0 : 0.7;
            onClick = handlePrev;
            role = "button";
            ariaLabel = "Previous photo";
          } else if (isNext) {
            transform = shouldReduce
              ? `translateX(0px) translateY(0px) scale(1) rotate(${tilt}deg)`
              : `translateX(170px) translateY(-30px) scale(0.74) rotateY(-22deg) rotate(${tilt}deg)`;
            zIndex = 2;
            opacity = shouldReduce ? 0 : 0.7;
            onClick = handleNext;
            role = "button";
            ariaLabel = "Next photo";
          } else {
            transform = `translateX(0px) translateY(0px) scale(0.7) rotate(${tilt}deg)`;
            zIndex = 1;
            opacity = 0;
          }

          return (
            <div
              key={`${photo.url}-${i}`}
              role={role}
              tabIndex={onClick ? 0 : -1}
              aria-label={ariaLabel}
              onClick={onClick}
              onKeyDown={
                onClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClick();
                      }
                    }
                  : undefined
              }
              className="absolute"
              style={{
                width: "380px",
                transform,
                zIndex,
                opacity,
                pointerEvents: opacity === 0 ? "none" : "auto",
                cursor: onClick ? "pointer" : "default",
                transition: shouldReduce
                  ? "opacity 0.3s ease"
                  : `transform 0.8s ${cssEasings.springBouncy}, opacity 0.5s ease`,
                filter: "drop-shadow(0 18px 36px rgba(26, 27, 24,0.25))",
              }}
            >
              <div
                className="bg-white"
                style={{
                  padding: "12px 12px 56px 12px",
                  borderRadius: "3px",
                }}
              >
                <div
                  className="overflow-hidden bg-[#F1EFE9]"
                  style={{ width: "100%", aspectRatio: "1/1" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `Memory ${i + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      filter: "contrast(1.04) saturate(1.10) brightness(0.99)",
                    }}
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Caption with word-by-word blur reveal */}
      <div className="w-full max-w-sm flex flex-col items-center pt-2">
        <div
          className="text-center px-4"
          style={{
            minHeight: "60px",
            fontFamily: "var(--font-caveat, cursive)",
            fontSize: "20px",
            lineHeight: "1.3",
            color: "#5A4A40",
          }}
        >
          <AnimatePresence mode="wait">
            {activePhoto?.caption ? (
              <motion.p
                key={`cap-${activeIndex}`}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={{
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                }}
                transition={getReducedMotionTransition(shouldReduce, { duration: 0.3 })}
              >
                {activePhoto.caption.split(" ").map((word, i) => (
                  <motion.span
                    key={`w-${activeIndex}-${i}`}
                    initial={
                      shouldReduce ? { opacity: 1 } : { filter: "blur(10px)", opacity: 0, y: 5 }
                    }
                    animate={
                      shouldReduce
                        ? { opacity: 1 }
                        : { filter: "blur(0px)", opacity: 1, y: 0 }
                    }
                    transition={{
                      duration: shouldReduce ? 0 : 0.22,
                      ease: "easeInOut",
                      delay: shouldReduce ? 0 : 0.025 * i,
                    }}
                    style={{ display: "inline-block" }}
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
              </motion.p>
            ) : (
              <span aria-hidden="true">&nbsp;</span>
            )}
          </AnimatePresence>
        </div>

        {/* Arrow nav + counter */}
        <div className="flex items-center gap-5 mt-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={total <= 1}
            aria-label="Previous photo"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: accent,
              color: theme.colors.background,
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p
            className="text-[11px] opacity-60 min-w-[60px] text-center"
            style={{ color: textColor }}
          >
            {activeIndex + 1} of {total}
          </p>
          <button
            type="button"
            onClick={handleNext}
            disabled={total <= 1}
            aria-label="Next photo"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: accent,
              color: theme.colors.background,
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Continue button — appears only after every photo viewed */}
        <div className="h-14 mt-4 flex items-center">
          <AnimatePresence>
            {allViewed && (
              <motion.button
                key="continue"
                type="button"
                onClick={handleContinue}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={getReducedMotionTransition(shouldReduce, { duration: 0.4 })}
                className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full"
                style={{
                  background: `${accent}18`,
                  color: accent,
                }}
                aria-label={hasNotes ? "Continue to notes" : "Continue to next part of the surprise"}
              >
                {hasNotes ? "Read the notes" : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
