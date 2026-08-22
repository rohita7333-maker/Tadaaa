"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { particleLayout } from "@/lib/scroll-story/seeded";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { SEAM_SKY_TO_MESSAGE, SERIF_STACK } from "./shared";

const STAR_COUNT = 30;
const LANTERN_COUNT = 14;
const PARALLAX_FACTOR_A = -0.12;
const PARALLAX_FACTOR_B = -0.22;

interface SkyHeroProps {
  config: StoryConfig;
}

/**
 * Scene 1 — night sky warming to a sand horizon, twinkling stars and drifting
 * lantern motes on two parallax bands.
 *
 * Editorial re-skin: the ground ramps ink → sand through four documented
 * ink→sand mixes (22 / 46 / 66 / 84 %), the same derivation convention the
 * `derived` block in `src/lib/design-tokens.ts` uses. No hue outside the
 * editorial palette appears.
 *
 * GRADIENT SEAM CONTRACT: final stop #CCAC9F (SEAM_SKY_TO_MESSAGE) ===
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
          "radial-gradient(70% 30% at 50% 100%, rgba(204,172,159,0.45), transparent 70%), " +
          // ink → sand, stepped through documented mixes of the two primitives
          `linear-gradient(180deg, #1A1A1A 0%, #413A37 22%, #6C5D57 46%, #8F7A72 66%, #AF958A 84%, ${SEAM_SKY_TO_MESSAGE} 100%)`,
      }}
    >
      <style>{`
        @keyframes ss-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes ss-lantern-float {
          from { transform: translateY(0) scale(var(--ss-scale, 1)); }
          to { transform: translateY(-14px) scale(var(--ss-scale, 1)); }
        }
        @keyframes ss-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        /* Ambient motion is killed in CSS as well as JS. The JS flag
           (useReducedMotion) cannot be known during SSR, so relying on it
           alone leaves the first painted frame animating; this media query is
           authoritative and needs no hydration branch. */
        @media (prefers-reduced-motion: reduce) {
          .ss-anim { animation: none !important; }
        }
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
            className="ss-anim absolute h-0.5 w-0.5 rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: "var(--paper)",
              opacity: 0.6,
              animation: reduced
                ? "none"
                : `ss-twinkle ${p.duration.toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Parallax band B — lantern motes (faster drift) */}
      <div
        ref={bandBRef}
        data-band="b"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        {lanterns.map((p, i) => (
          <span
            key={i}
            className="ss-anim absolute block h-[26px] w-[18px] rounded-[7px] after:absolute after:-inset-2.5 after:rounded-full after:bg-[radial-gradient(circle,rgba(204,172,159,0.55),transparent_70%)] after:blur-[6px] after:content-['']"
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                "--ss-scale": p.scale,
                transform: `scale(${p.scale})`,
                background:
                  "radial-gradient(circle at 50% 62%, #E0CDC5 0%, #CCAC9F 48%, rgba(26,26,26,0.55) 100%)",
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
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontSize: "clamp(17px, 2.6vw, 20px)",
            color: "var(--sand)",
          }}
        >
          {config.eyebrow}
        </p>
        <h1
          className="mt-3"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            fontSize: "clamp(38px, 10vw, 56px)",
            lineHeight: 1.1,
            color: "var(--paper)",
          }}
        >
          {config.recipient}
        </h1>
        <p
          className="mt-5 text-xs font-semibold uppercase"
          style={{ letterSpacing: "0.22em", color: "var(--sand)" }}
        >
          {config.occasionLine}
        </p>
      </div>

      {/* Bobbing scroll hint at the bottom of the first viewport */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[calc(100svh-84px)] flex justify-center"
      >
        <span
          className="ss-anim text-xs"
          style={{
            letterSpacing: "0.1em",
            color: "var(--sand)",
            animation: reduced ? "none" : "ss-bob 2.4s ease-in-out infinite",
          }}
        >
          Scroll slowly ↓
        </span>
      </div>
    </section>
  );
}
