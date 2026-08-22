"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { ArrowDown } from "lucide-react";
import { easings, durations, springs, staggers, makeReducedMotionTransition } from "@/lib/motion";

interface MessageRevealProps {
  title: string;
  message: string;
  theme: Theme;
  onComplete: () => void;
  /**
   * Accepted for call-site compatibility but no longer rendered: the mockup's
   * message scene (`.tapopen`) is a clean text scene, and floating polaroids
   * behind a transparent form made the copy hard to read.
   */
  photos?: { url: string; caption?: string; rotation_deg?: number }[];
}

export default function MessageReveal({
  title,
  message,
  theme,
  onComplete,
}: MessageRevealProps) {
  const shouldReduce = useReducedMotion();
  const titleWords = title.split(" ");
  // Split by explicit line breaks; fallback = single block
  const bodyLines = message.split("\n").filter(Boolean);
  const safeBodyLines = bodyLines.length > 0 ? bodyLines : [message];

  // Title completes at: titleWords.length * per-word stagger + one word's duration
  const titleEndDelay = titleWords.length * staggers.word + durations.quick;
  // Body lines start after title settles
  const bodyStartDelay = titleEndDelay + staggers.support;

  // Mockup `.tapopen` (L496-499): ink ground, 34px serif title, 16px body at
  // 85% white on a 340px measure.
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-7 pt-16 pb-28 text-center">
      {/* Mockup `.s-hero .bg` — the theme survives as a dimmed wash over ink
          rather than as the ground itself. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-25 [filter:brightness(0.55)_saturate(0.85)]"
        style={{ background: theme.colors.background }}
      />

      <div className="relative max-w-[340px] text-center" style={{ zIndex: 20 }}>
        {/* Title — word-by-word blur reveal, rhymes with PolaroidCarousel captions */}
        <motion.h2
          className="mb-3.5 font-heading text-[34px] leading-tight text-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              initial={shouldReduce
                ? { opacity: 1 }
                : { filter: "blur(8px)", opacity: 0, y: 4 }
              }
              animate={shouldReduce
                ? { opacity: 1 }
                : { filter: "blur(0px)", opacity: 1, y: 0 }
              }
              transition={shouldReduce
                ? { duration: durations.instant }
                : {
                    duration: durations.quick,
                    ease: easings.entrance,
                    delay: staggers.lead + i * staggers.word,
                  }
              }
              style={{ display: "inline-block", marginRight: "0.25em" }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h2>

        {/* Body — line-by-line with hierarchy stagger (not a uniform word drip) */}
        {/* globals.css sets a base `p { color: var(--stone) }`, so the ink-ground
            colour has to live on each paragraph, not on this wrapper. */}
        <div className="mb-[22px] text-base leading-[1.7]">
          {safeBodyLines.map((line, i) => (
            <motion.p
              key={i}
              className="text-white/85"
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={makeReducedMotionTransition(shouldReduce, {
                ease: easings.entrance,
                duration: durations.base,
                delay: bodyStartDelay + i * staggers.detail,
              })}
              style={{ marginBottom: i < safeBodyLines.length - 1 ? "0.5em" : 0 }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {/* CTA — arrives after all body lines settle */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={shouldReduce
            ? { duration: durations.instant }
            : {
                ...springs.soft,
                delay: bodyStartDelay + safeBodyLines.length * staggers.detail + staggers.support,
              }
          }
        >
          <button type="button" onClick={onComplete} className="ed-btn ed-btn-coral">
            Continue
            <ArrowDown className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
