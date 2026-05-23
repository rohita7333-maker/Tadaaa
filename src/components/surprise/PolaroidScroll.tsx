"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { type Theme } from "@/lib/themes";
import { getReducedMotionTransition } from "@/lib/a11y";

interface Photo {
  url: string;
  caption?: string;
  rotation_deg?: number;
}

interface Note {
  contributor_name: string;
  message: string;
}

interface PolaroidScrollProps {
  photos: Photo[];
  theme: Theme;
  title: string;
  /**
   * Message-only contributions from collaborative invites (Task B2).
   * Photo contributions are merged into `photos` upstream; these are the
   * letters-without-an-image cards rendered after the photo deck so
   * they aren't lost.
   */
  notes?: Note[];
  onComplete: () => void;
}

// Deterministic tilts — feels hand-placed.
const TILTS = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];

// Total "screens" inside this stage = photos + (notes ? 1 : 0).
// Each screen advances on tap → final screen → onComplete().
export default function PolaroidScroll({
  photos,
  theme,
  title,
  notes = [],
  onComplete,
}: PolaroidScrollProps) {
  const shouldReduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  const hasNotes = notes.length > 0;
  // Steps: 0..photos.length-1 → photos, photos.length → notes screen (if any).
  const totalSteps = photos.length + (hasNotes ? 1 : 0);

  // Auto-fire onComplete if there's literally nothing to show (empty surprise).
  useEffect(() => {
    if (totalSteps === 0) onComplete();
  }, [totalSteps, onComplete]);

  const advance = useCallback(() => {
    setDirection(1);
    if (idx + 1 >= totalSteps) {
      onComplete();
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, totalSteps, onComplete]);

  // Keyboard: → / Enter / Space → next; ← → previous.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        setDirection(-1);
        setIdx((i) => i - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, idx]);

  if (totalSteps === 0) return null;

  const textColor = theme.colors.text;
  const accentColor = theme.colors.accent;
  const showingNotes = hasNotes && idx === photos.length;
  const currentPhoto = !showingNotes ? photos[idx] : null;
  const tilt =
    currentPhoto && currentPhoto.rotation_deg !== undefined && currentPhoto.rotation_deg !== 0
      ? currentPhoto.rotation_deg
      : TILTS[idx % TILTS.length];

  const slideVariants = {
    enter: (dir: number) => ({
      x: shouldReduce ? 0 : dir > 0 ? 60 : -60,
      opacity: 0,
      scale: shouldReduce ? 1 : 0.96,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({
      x: shouldReduce ? 0 : dir > 0 ? -60 : 60,
      opacity: 0,
      scale: shouldReduce ? 1 : 0.96,
    }),
  };

  return (
    <button
      type="button"
      onClick={advance}
      aria-label={
        showingNotes
          ? "Continue to next part of the surprise"
          : `Photo ${idx + 1} of ${photos.length} — tap for next`
      }
      className="w-full min-h-screen flex flex-col items-center justify-between px-6 py-8 cursor-pointer focus:outline-none"
      style={{ background: theme.colors.background }}
    >
      {/* Header */}
      <div className="w-full max-w-sm text-center pt-4">
        <p
          className="text-xs font-medium opacity-70 uppercase tracking-wider"
          style={{ color: textColor }}
        >
          {showingNotes ? "Notes from people who love you" : "A memory for you"}
        </p>
        <h1
          className="font-heading text-2xl mt-2"
          style={{ color: textColor }}
        >
          {title}
        </h1>
        {/* Progress dots */}
        {totalSteps > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? "20px" : "6px",
                  background: i <= idx ? accentColor : `${accentColor}33`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card */}
      <div className="flex-1 w-full max-w-sm flex items-center justify-center py-6">
        <AnimatePresence mode="wait" custom={direction}>
          {!showingNotes && currentPhoto ? (
            <motion.div
              key={`photo-${idx}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={getReducedMotionTransition(shouldReduce, {
                type: "spring" as const,
                stiffness: 220,
                damping: 26,
              })}
              className="w-full"
              style={{
                filter: "drop-shadow(0 18px 36px rgba(45,41,38,0.25))",
              }}
            >
              <div
                className="bg-white mx-auto"
                style={{
                  padding: "12px 12px 56px 12px",
                  borderRadius: "3px",
                  transform: `rotate(${tilt}deg)`,
                  maxWidth: "360px",
                }}
              >
                <div
                  className="overflow-hidden bg-[#F5EDE3]"
                  style={{ width: "100%", aspectRatio: "1/1" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.caption || `Memory ${idx + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      filter: "contrast(1.04) saturate(1.10) brightness(0.99)",
                    }}
                    loading={idx === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                </div>
                {currentPhoto.caption ? (
                  <p
                    className="text-center mt-3 px-2"
                    style={{
                      fontFamily: "var(--font-caveat, cursive)",
                      fontSize: "18px",
                      lineHeight: "1.3",
                      color: "#5A4A40",
                      minHeight: "26px",
                    }}
                  >
                    {currentPhoto.caption}
                  </p>
                ) : (
                  <div style={{ height: "26px" }} />
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="notes"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={getReducedMotionTransition(shouldReduce, {
                type: "spring" as const,
                stiffness: 220,
                damping: 26,
              })}
              className="w-full space-y-4"
            >
              {notes.map((n, i) => (
                <div
                  key={`n-${i}`}
                  className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_rgba(45,41,38,0.16)]"
                >
                  <p
                    className="text-[#2D2926] leading-relaxed"
                    style={{
                      fontFamily: "var(--font-caveat, cursive)",
                      fontSize: "1.15rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {n.message}
                  </p>
                  <p className="mt-3 text-right text-xs text-[#6B5E57]">
                    — {n.contributor_name}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer cue */}
      <div className="w-full max-w-sm text-center pb-4">
        <div
          className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full"
          style={{
            background: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {idx + 1 >= totalSteps ? "Tap to continue" : "Tap for the next one"}
          <ChevronRight className="w-4 h-4" />
        </div>
        {totalSteps > 1 && (
          <p
            className="mt-3 text-[11px] opacity-50"
            style={{ color: textColor }}
          >
            {idx + 1} of {totalSteps}
          </p>
        )}
      </div>
    </button>
  );
}
