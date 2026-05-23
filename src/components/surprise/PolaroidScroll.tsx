"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
   * letters-without-an-image cards rendered after the polaroid stack so
   * they aren't lost.
   */
  notes?: Note[];
  onComplete: () => void;
}

// Deterministic tilts — feels hand-placed
const TILTS = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];

export default function PolaroidScroll({
  photos,
  theme,
  title,
  notes = [],
  onComplete,
}: PolaroidScrollProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [allSeen, setAllSeen] = useState(false);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  // Fire immediately if there's nothing to show — no photos AND no notes.
  // When only notes are present we still render so contributors aren't
  // silently dropped on photo-less invites.
  useEffect(() => {
    if (photos.length === 0 && notes.length === 0) onComplete();
  }, [photos.length, notes.length, onComplete]);

  useEffect(() => {
    if (photos.length === 0) return;
    const observers: IntersectionObserver[] = [];

    photos.forEach((_, idx) => {
      const el = photoRefs.current[idx];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleCount((c) => Math.max(c, idx + 1));
          }
        },
        { threshold: 0.35 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    // CTA sentinel
    if (ctaRef.current) {
      const ctaObs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setAllSeen(true);
        },
        { threshold: 0.5 }
      );
      ctaObs.observe(ctaRef.current);
      observers.push(ctaObs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [photos]);

  const shouldReduce = useReducedMotion();

  if (photos.length === 0 && notes.length === 0) return null;

  const textColor = theme.colors.text;
  const accentColor = theme.colors.accent;
  // Derive muted text — 70% opacity via hex
  const mutedColor = textColor;

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{ background: theme.colors.background }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 px-6 py-4 backdrop-blur-sm border-b"
        style={{
          background: `${theme.colors.backgroundSecondary}cc`,
          borderColor: `${accentColor}20`,
        }}
      >
        <p
          className="text-center text-sm font-medium opacity-70"
          style={{ color: textColor }}
        >
          Someone made this for you ✨
        </p>
      </div>

      {/* Title */}
      <motion.div
        className="text-center px-8 pt-12 pb-6"
        initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getReducedMotionTransition(shouldReduce, { duration: 0.7, delay: 0.2 })}
      >
        <h1
          className="text-3xl leading-snug font-heading"
          style={{ color: textColor }}
        >
          {title}
        </h1>
        <motion.div
          className="flex justify-center mt-6"
          animate={shouldReduce ? {} : { y: [0, 8, 0] }}
          transition={getReducedMotionTransition(shouldReduce, { duration: 1.5, repeat: Infinity })}
        >
          <ChevronDown
            className="w-6 h-6 opacity-40"
            style={{ color: mutedColor }}
          />
        </motion.div>
      </motion.div>

      {/* Polaroid stack */}
      <div className="px-6 pb-8 space-y-8 max-w-sm mx-auto">
        {photos.map((photo, idx) => {
          const tilt =
            photo.rotation_deg !== undefined && photo.rotation_deg !== 0
              ? photo.rotation_deg
              : TILTS[idx % TILTS.length];

          return (
            <div
              key={idx}
              ref={(el) => {
                photoRefs.current[idx] = el;
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: shouldReduce ? 0 : 40, rotate: tilt }}
                animate={
                  visibleCount > idx
                    ? { opacity: 1, y: 0, rotate: tilt }
                    : { opacity: 0, y: shouldReduce ? 0 : 40, rotate: tilt }
                }
                transition={getReducedMotionTransition(shouldReduce, { duration: 0.6, ease: "easeOut", delay: 0.08 })}
                whileHover={shouldReduce ? {} : { rotate: 0, scale: 1.02 }}
                className="cursor-default"
                style={{
                  filter: "drop-shadow(0 12px 28px rgba(45,41,38,0.18))",
                }}
              >
                {/* Polaroid frame */}
                <div
                  className="bg-white"
                  style={{ padding: "10px 10px 52px 10px", borderRadius: "2px" }}
                >
                  <div
                    className="overflow-hidden"
                    style={{ width: "100%", aspectRatio: "1/1" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Memory ${idx + 1}`}
                      className="w-full h-full object-cover"
                      style={{
                        filter:
                          "contrast(1.02) saturate(1.08) brightness(0.98)",
                      }}
                      loading={idx === 0 ? "eager" : "lazy"}
                    />
                  </div>
                  {photo.caption && (
                    <p
                      className="text-center mt-2 px-1"
                      style={{
                        fontFamily: "var(--font-caveat, cursive)",
                        fontSize: "15px",
                        lineHeight: "1.3",
                        color: "#6B5E57",
                        height: "36px",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {photo.caption}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* Contributor letters — message-only contributions from family
            (Task B2). Rendered as folded-paper cards beneath the polaroids
            so they're part of the same scroll moment. */}
        {notes.length > 0 && (
          <div className="pt-4 space-y-4">
            <p
              className="text-center text-sm opacity-70"
              style={{
                color: mutedColor,
                fontFamily: "var(--font-caveat, cursive)",
                fontSize: "1.1rem",
              }}
            >
              Notes from people who love you
            </p>
            {notes.map((note, idx) => (
              <motion.div
                key={`note-${idx}`}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getReducedMotionTransition(shouldReduce, { duration: 0.5, delay: 0.05 * idx })}
                className="bg-white rounded-2xl p-5 shadow-[0_6px_18px_rgba(45,41,38,0.10)] border border-[#D4CBC3]/40"
              >
                <p
                  className="text-[#2D2926] leading-relaxed"
                  style={{
                    fontFamily: "var(--font-caveat, cursive)",
                    fontSize: "1.15rem",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {note.message}
                </p>
                <p className="mt-3 text-right text-xs text-[#6B5E57]">
                  — {note.contributor_name}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA sentinel */}
        <div ref={ctaRef} className="pt-4 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
            animate={allSeen ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduce ? 0 : 20 }}
            transition={getReducedMotionTransition(shouldReduce, { duration: 0.6 })}
          >
            <p
              className="mb-6 opacity-70"
              style={{
                color: mutedColor,
                fontFamily: "var(--font-caveat, cursive)",
                fontSize: "1.2rem",
              }}
            >
              There&apos;s more waiting for you...
            </p>
            <button
              onClick={onComplete}
              aria-label="Continue to the next part of the surprise"
              className="h-14 px-10 rounded-full text-white text-base font-medium shadow-lg pulse-glow"
              style={{ background: accentColor }}
            >
              Continue →
            </button>
          </motion.div>

          {!allSeen && photos.length > 1 && (
            <motion.p
              className="text-xs opacity-40 mt-8"
              style={{ color: mutedColor }}
              animate={shouldReduce ? {} : { opacity: [0.3, 0.6, 0.3] }}
              transition={getReducedMotionTransition(shouldReduce, { duration: 2, repeat: Infinity })}
            >
              Keep scrolling ↓
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
