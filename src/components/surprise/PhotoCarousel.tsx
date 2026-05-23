"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { getReducedMotionTransition } from "@/lib/a11y";

interface Photo {
  url: string;
  caption?: string;
  rotation_deg?: number;
}

interface PhotoCarouselProps {
  photos: Photo[];
  theme: Theme;
  message?: string;
  onComplete: () => void;
}

// Deterministic tilt fallback — feels hand-placed, not random on every render
const TILTS = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];

export default function PhotoCarousel({ photos, theme, message = "", onComplete }: PhotoCarouselProps) {
  const shouldReduce = useReducedMotion();

  // Clamp via lazy initializer so we never store an out-of-range index.
  const [current, setCurrent] = useState(() => Math.min(0, Math.max(0, photos.length - 1)));
  const [direction, setDirection] = useState(1);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCompleteRef = useRef(onComplete);

  // Sync ref to latest callback inside an effect (not during render).
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Fire empty-photos completion via effect, not render.
  useEffect(() => {
    if (photos.length === 0) onCompleteRef.current();
  }, [photos.length]);

  // Compute the clamped index inline instead of via effect-driven setState —
  // clamping is a derivation, not external-state sync.
  const safeCurrent =
    photos.length === 0 ? 0 : Math.min(current, photos.length - 1);

  const goNext = useCallback(() => {
    clearTimeout(autoTimer.current);
    if (current === photos.length - 1) {
      onCompleteRef.current();
      return;
    }
    setDirection(1);
    setCurrent((c) => c + 1);
  }, [current, photos.length]);

  function goPrev() {
    clearTimeout(autoTimer.current);
    if (current === 0) return;
    setDirection(-1);
    setCurrent((c) => c - 1);
  }

  // Auto-advance 6s per photo; last photo waits for tap
  useEffect(() => {
    if (current === photos.length - 1) return; // let user tap on last
    autoTimer.current = setTimeout(() => {
      setDirection(1);
      setCurrent((c) => c + 1);
    }, 6000);
    return () => clearTimeout(autoTimer.current);
  }, [current, photos.length]);

  function handleDragEnd(_e: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -40) goNext();
    else if (info.offset.x > 40) goPrev();
  }

  if (photos.length === 0) return null;

  const photo = photos[safeCurrent] ?? photos[0];
  if (!photo) return null;
  const tilt = photo.rotation_deg !== undefined && photo.rotation_deg !== 0
    ? photo.rotation_deg
    : TILTS[current % TILTS.length];

  const captionText = photo.caption?.trim()
    || (message ? (message.length > 48 ? message.slice(0, 48).trimEnd() + "…" : message) : "");

  const isLast = current === photos.length - 1;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: theme.colors.background }}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }} />

      {/* Polaroid card */}
      <div className="relative w-full flex items-center justify-center px-8 z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={{
              x: shouldReduce ? 0 : (direction > 0 ? 280 : -280),
              rotate: direction > 0 ? 8 : -8,
              opacity: 0,
            }}
            animate={{
              x: 0,
              rotate: tilt,
              opacity: 1,
            }}
            exit={{
              x: shouldReduce ? 0 : (direction > 0 ? -280 : 280),
              rotate: direction > 0 ? -8 : 8,
              opacity: 0,
            }}
            transition={getReducedMotionTransition(shouldReduce, { duration: 0.45, ease: "easeOut" as const })}
            className="cursor-grab active:cursor-grabbing select-none"
            style={{
              filter: "drop-shadow(0 12px 32px rgba(45,41,38,0.22))",
            }}
          >
            {/* Polaroid frame */}
            <div className="bg-white rounded-sm" style={{ padding: "10px 10px 52px 10px" }}>
              {/* Photo */}
              <div className="overflow-hidden" style={{ width: "min(72vw, 280px)", aspectRatio: "3/4" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Memory ${current + 1}`}
                  className="w-full h-full object-cover"
                  style={{ filter: "contrast(1.02) saturate(1.08) brightness(0.98)" }}
                  loading={current === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
              </div>

              {/* Polaroid bottom — caption */}
              {captionText && (
                <div
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
                  {captionText}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2 z-10">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                clearTimeout(autoTimer.current);
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              aria-label={`Go to photo ${i + 1} of ${photos.length}`}
              aria-current={i === current}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "24px" : "8px",
                height: "8px",
                backgroundColor: i === current
                  ? theme.colors.accent
                  : `${theme.colors.accent}40`,
              }}
            />
          ))}
        </div>
      )}

      {/* Continue button on last photo */}
      {isLast && (
        <motion.button
          onClick={goNext}
          initial={{ opacity: 0, y: shouldReduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getReducedMotionTransition(shouldReduce, { delay: 0.5 })}
          className="absolute bottom-8 left-0 right-0 mx-auto w-fit px-8 py-3 rounded-full text-white text-sm font-medium shadow-lg"
          style={{ background: theme.colors.accent }}
          aria-label="Continue to next section"
        >
          Continue ✨
        </motion.button>
      )}

      {/* Swipe hint — only on first photo */}
      {current === 0 && photos.length > 1 && (
        <motion.p
          className="absolute bottom-8 text-xs opacity-50"
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={getReducedMotionTransition(shouldReduce, { delay: 1.5 })}
        >
          Swipe to flip through ✦
        </motion.p>
      )}

      {/* Left / right tap zones (invisible) */}
      <button
        onClick={goPrev}
        className="absolute left-0 top-0 bottom-0 w-1/4 z-20"
        aria-label="Previous photo"
        style={{ opacity: 0 }}
      />
      <button
        onClick={goNext}
        className="absolute right-0 top-0 bottom-0 w-1/4 z-20"
        aria-label="Next photo"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
