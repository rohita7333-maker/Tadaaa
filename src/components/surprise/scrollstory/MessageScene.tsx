"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { particleLayout } from "@/lib/scroll-story/seeded";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  BRAND_PARTY_COLORS,
  HANDWRITING_STACK,
  SEAM_MESSAGE_TO_PLAN,
  SEAM_SKY_TO_MESSAGE,
  SERIF_STACK,
} from "./shared";

const CONFETTI_COUNT = 24;

interface MessageSceneProps {
  config: StoryConfig;
}

/**
 * Scene 2 — the personal message under gently falling confetti.
 * GRADIENT SEAM CONTRACT: first stop #E8D5A8 (SEAM_SKY_TO_MESSAGE) ===
 * SkyHero's final stop; final stop #FFF8F0 (SEAM_MESSAGE_TO_PLAN) ===
 * PlanScene's first stop.
 */
export default function MessageScene({ config }: MessageSceneProps) {
  const reduced = useReducedMotion();

  const confetti = useMemo(
    () =>
      particleLayout(`${config.slug}-message-confetti`, CONFETTI_COUNT, {
        minX: 2,
        maxX: 98,
      }),
    [config.slug]
  );

  const fromLine = config.sender
    ? `from ${config.sender}, with love —`
    : "with love —";

  return (
    <section
      aria-label="A message for you"
      className="relative flex min-h-[120vh] items-center justify-center overflow-hidden px-6"
      style={{
        background: `linear-gradient(180deg, ${SEAM_SKY_TO_MESSAGE} 0%, #F5EDE3 45%, ${SEAM_MESSAGE_TO_PLAN} 100%)`,
      }}
    >
      <style>{`
        @keyframes ss-confetti-fall {
          0% { transform: translate3d(0, -8vh, 0) rotate(0deg) scale(var(--ss-scale, 1)); opacity: 0; }
          8% { opacity: 0.9; }
          88% { opacity: 0.9; }
          100% { transform: translate3d(0, 128vh, 0) rotate(540deg) scale(var(--ss-scale, 1)); opacity: 0; }
        }
      `}</style>

      {/* Falling confetti — seeded positions/delays, killed under reduced motion */}
      {!reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {confetti.map((p, i) => (
            <span
              key={i}
              className="absolute top-0 block h-3.5 w-2 rounded-[2px] will-change-transform"
              style={
                {
                  left: `${p.x}%`,
                  backgroundColor:
                    BRAND_PARTY_COLORS[i % BRAND_PARTY_COLORS.length],
                  "--ss-scale": p.scale,
                  animation: `ss-confetti-fall ${(7 + p.duration * 1.5).toFixed(2)}s linear infinite`,
                  animationDelay: `-${(p.delay * 2.2).toFixed(2)}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      <Reveal className="relative z-10 mx-auto max-w-xl py-32 text-center">
        <p
          className="text-rose-deep"
          style={{
            fontFamily: HANDWRITING_STACK,
            fontSize: "clamp(26px, 4.5vw, 34px)",
          }}
        >
          {fromLine}
        </p>
        <p
          className="mt-6 text-charcoal"
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontSize: "clamp(20px, 3.6vw, 27px)",
            lineHeight: 1.55,
          }}
        >
          {config.message}
        </p>
      </Reveal>
    </section>
  );
}
