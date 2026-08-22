"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { particleLayout } from "@/lib/scroll-story/seeded";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  BRAND_PARTY_COLORS,
  SEAM_MESSAGE_TO_PLAN,
  SEAM_SKY_TO_MESSAGE,
  SERIF_STACK,
} from "./shared";

const CONFETTI_COUNT = 24;

interface MessageSceneProps {
  config: StoryConfig;
}

/**
 * Scene 2 — the personal message under gently falling paper confetti
 * (`.s-msg` in the mockup: paper ground, italic serif attribution, body copy).
 *
 * GRADIENT SEAM CONTRACT: first stop #CCAC9F (SEAM_SKY_TO_MESSAGE) ===
 * SkyHero's final stop; final stop #FFFEFD (SEAM_MESSAGE_TO_PLAN) ===
 * PlanScene's first stop. The mid stop is a documented sand→paper mix.
 */
export default function MessageScene({ config }: MessageSceneProps) {

  const confetti = useMemo(
    () =>
      particleLayout(`${config.slug}-message-confetti`, CONFETTI_COUNT, {
        minX: 2,
        maxX: 98,
      }),
    [config.slug]
  );

  const fromLine = config.sender ? `From ${config.sender}` : "With love";

  return (
    <section
      aria-label="A message for you"
      className="relative flex min-h-[120vh] items-center justify-center overflow-hidden px-6"
      style={{
        background: `linear-gradient(180deg, ${SEAM_SKY_TO_MESSAGE} 0%, #E3D1C9 45%, ${SEAM_MESSAGE_TO_PLAN} 100%)`,
      }}
    >
      <style>{`
        @keyframes ss-confetti-fall {
          0% { transform: translate3d(0, -8vh, 0) rotate(0deg) scale(var(--ss-scale, 1)); opacity: 0; }
          8% { opacity: 0.9; }
          88% { opacity: 0.9; }
          100% { transform: translate3d(0, 128vh, 0) rotate(540deg) scale(var(--ss-scale, 1)); opacity: 0; }
        }
        /* Reduced motion is handled in CSS, not JS: a JS branch here would
           change the tree between SSR and the first client render (React
           hydration error #418), because the preference is unknowable on the
           server. CSS needs no such branch. */
        @media (prefers-reduced-motion: reduce) {
          .ss-confetti-layer { display: none; }
        }
      `}</style>

      {/* Falling confetti — seeded positions/delays, killed under reduced motion */}
      <div
        aria-hidden="true"
        className="ss-confetti-layer pointer-events-none absolute inset-0"
      >
          {confetti.map((p, i) => (
            <span
              key={i}
              className="absolute top-0 block h-3.5 w-2 will-change-transform"
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

      <Reveal className="relative z-10 mx-auto max-w-xl py-32 text-center">
        <p
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontSize: "16px",
            color: "var(--stone)",
          }}
        >
          {fromLine}
        </p>
        <p
          className="mx-auto mt-5 max-w-[480px]"
          style={{
            fontSize: "18px",
            lineHeight: 1.7,
            color: "var(--ink)",
          }}
        >
          {config.message}
        </p>
      </Reveal>
    </section>
  );
}
