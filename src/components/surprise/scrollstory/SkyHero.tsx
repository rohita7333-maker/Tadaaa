"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { particleLayout } from "@/lib/scroll-story/seeded";
import type { StoryConfig } from "@/lib/scroll-story/config";
import {
  BRAND_PARTY_COLORS,
  HANDWRITING_STACK,
  SEAM_SKY_TO_MESSAGE,
  SERIF_STACK,
} from "./shared";

const STAR_COUNT = 30;
const LANTERN_COUNT = 14;
const PARALLAX_FACTOR_A = -0.12;
const PARALLAX_FACTOR_B = -0.22;

// --- Bunting garland — generated deterministically in module scope (no randomness) ---
const BUNTING_FLAG_COUNT = 18;
const ROPE_START = { x: 0, y: 24 };
const ROPE_CTRL = { x: 500, y: 92 };
const ROPE_END = { x: 1000, y: 24 };

function ropePoint(t: number): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * ROPE_START.x + 2 * mt * t * ROPE_CTRL.x + t * t * ROPE_END.x,
    y: mt * mt * ROPE_START.y + 2 * mt * t * ROPE_CTRL.y + t * t * ROPE_END.y,
  };
}

const BUNTING_FLAGS = Array.from({ length: BUNTING_FLAG_COUNT }, (_, i) => {
  const t = (i + 0.5) / BUNTING_FLAG_COUNT;
  const { x, y } = ropePoint(t);
  return { x, y, color: BRAND_PARTY_COLORS[i % BRAND_PARTY_COLORS.length] };
});

interface SkyHeroProps {
  config: StoryConfig;
}

/**
 * Scene 1 — evening sky, twinkling stars, floating lanterns, parallax bands.
 * GRADIENT SEAM CONTRACT: final stop #E8D5A8 (SEAM_SKY_TO_MESSAGE) ===
 * MessageScene's first stop.
 */
export default function SkyHero({ config }: SkyHeroProps) {
  const reduced = useReducedMotion();
  const bandARef = useRef<HTMLDivElement>(null);
  const bandBRef = useRef<HTMLDivElement>(null);

  const stars = useMemo(
    () => particleLayout(`${config.slug}-sky-stars`, STAR_COUNT, { maxY: 72 }),
    [config.slug]
  );
  const lanterns = useMemo(
    () =>
      particleLayout(`${config.slug}-sky-lanterns`, LANTERN_COUNT, {
        minX: 4,
        maxX: 96,
        minY: 8,
        maxY: 86,
      }),
    [config.slug]
  );

  // ONE rAF-throttled passive scroll listener drives both parallax bands.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (bandARef.current) {
          bandARef.current.style.transform = `translate3d(0, ${(PARALLAX_FACTOR_A * y).toFixed(1)}px, 0)`;
        }
        if (bandBRef.current) {
          bandBRef.current.style.transform = `translate3d(0, ${(PARALLAX_FACTOR_B * y).toFixed(1)}px, 0)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section
      aria-label={`A surprise for ${config.recipient}`}
      className="relative min-h-[175vh] overflow-hidden"
      style={{
        background:
          "radial-gradient(70% 30% at 50% 100%, rgba(201,169,110,0.55), transparent 70%), " +
          `linear-gradient(180deg, #3E3733 0%, #6B5E57 22%, #9B3D42 48%, #C4686D 66%, #E8A5A8 82%, ${SEAM_SKY_TO_MESSAGE} 100%)`,
      }}
    >
      <style>{`
        @keyframes ss-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes ss-lantern-float {
          from { transform: translateY(0) scale(var(--ss-scale, 1)); }
          to { transform: translateY(-14px) scale(var(--ss-scale, 1)); }
        }
        @keyframes ss-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
      `}</style>

      {/* Parallax band A — stars (slow drift) */}
      <div
        ref={bandARef}
        data-band="a"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        {stars.map((p, i) => (
          <span
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-cream"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 0.6,
              animation: reduced
                ? "none"
                : `ss-twinkle ${p.duration.toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Parallax band B — lanterns (faster drift) */}
      <div
        ref={bandBRef}
        data-band="b"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        {lanterns.map((p, i) => (
          <span
            key={i}
            className="absolute block h-[26px] w-[18px] rounded-[7px] after:absolute after:-inset-2.5 after:rounded-full after:bg-[radial-gradient(circle,rgba(232,213,168,0.7),transparent_70%)] after:blur-[6px] after:content-['']"
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                "--ss-scale": p.scale,
                transform: `scale(${p.scale})`,
                background:
                  "radial-gradient(circle at 50% 62%, #E8D5A8 0%, #C9A96E 48%, rgba(155,61,66,0.85) 100%)",
                animation: reduced
                  ? "none"
                  : `ss-lantern-float ${(p.duration + 2).toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite alternate`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Centered hero copy — first viewport */}
      <div className="relative z-10 flex h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p
          className="text-gold-light"
          style={{
            fontFamily: HANDWRITING_STACK,
            fontSize: "clamp(24px, 4.5vw, 34px)",
          }}
        >
          {config.eyebrow}
        </p>
        <h1
          className="mt-2 text-cream"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 500,
            fontSize: "clamp(46px, 10vw, 84px)",
            lineHeight: 1.04,
            textShadow: "0 2px 28px rgba(35, 20, 15, 0.45)",
          }}
        >
          {config.recipient}
        </h1>
        <p className="mt-4 text-sm uppercase tracking-[0.38em] text-rose-light">
          {config.occasionLine}
        </p>
      </div>

      {/* Bobbing scroll hint at the bottom of the first viewport */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[calc(100svh-84px)] flex justify-center"
      >
        <span
          className="text-sm text-cream/80"
          style={{
            fontFamily: HANDWRITING_STACK,
            fontSize: "22px",
            animation: reduced ? "none" : "ss-bob 2.4s ease-in-out infinite",
          }}
        >
          scroll slowly ↓
        </span>
      </div>

      {/* Bunting garland across the bottom seam */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 130"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px] w-full"
      >
        <path
          d={`M ${ROPE_START.x} ${ROPE_START.y} Q ${ROPE_CTRL.x} ${ROPE_CTRL.y} ${ROPE_END.x} ${ROPE_END.y}`}
          fill="none"
          stroke="rgba(45, 41, 38, 0.55)"
          strokeWidth="3"
        />
        {BUNTING_FLAGS.map((flag, i) => (
          <polygon
            key={i}
            points={`${flag.x - 14},${flag.y} ${flag.x + 14},${flag.y} ${flag.x},${flag.y + 26}`}
            fill={flag.color}
            stroke="rgba(45, 41, 38, 0.25)"
            strokeWidth="1"
          />
        ))}
      </svg>
    </section>
  );
}
