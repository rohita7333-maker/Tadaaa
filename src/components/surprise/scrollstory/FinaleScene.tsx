"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { particleLayout } from "@/lib/scroll-story/seeded";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import { FINALE_NIGHT, SEAM_RSVP_TO_FINALE, SERIF_STACK } from "./shared";

const STAR_COUNT = 40;
const TICK_MS = 1000;

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingUntil(target: number, now: number): Remaining {
  // Floor to 00 when the moment has passed.
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface FinaleSceneProps {
  config: StoryConfig;
}

/**
 * Scene 6 — the countdown under a night sky (`.s-fin` in the mockup: ink
 * ground, sand `✦` stars, italic serif caption, bare tabular numerals, a
 * closing serif line).
 *
 * GRADIENT SEAM CONTRACT: first stop #D45847 (SEAM_RSVP_TO_FINALE) ===
 * RsvpScene's final stop; terminal stop #1A1A1A (FINALE_NIGHT). The coral
 * flare burns down through documented coral→ink mixes into night.
 */
export default function FinaleScene({ config }: FinaleSceneProps) {
  const reduced = useReducedMotion();
  // null until mounted so server + first client render match (hydration-safe).
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  const stars = useMemo(
    () => particleLayout(`${config.slug}-finale-stars`, STAR_COUNT),
    [config.slug]
  );

  useEffect(() => {
    if (!config.countdownTo) return;
    const target = new Date(config.countdownTo).getTime();
    if (Number.isNaN(target)) return;
    const tick = () => setRemaining(remainingUntil(target, Date.now()));
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [config.countdownTo]);

  const units: Array<{ label: string; value: string }> = [
    { label: "Days", value: remaining ? pad(remaining.days) : "00" },
    { label: "Hrs", value: remaining ? pad(remaining.hours) : "00" },
    { label: "Min", value: remaining ? pad(remaining.minutes) : "00" },
    { label: "Sec", value: remaining ? pad(remaining.seconds) : "00" },
  ];

  return (
    <section
      aria-label="The countdown"
      className="relative overflow-hidden px-6 py-32"
      style={{
        background: `linear-gradient(180deg, ${SEAM_RSVP_TO_FINALE} 0%, #8A3F35 20%, #522C28 44%, #2B2020 70%, ${FINALE_NIGHT} 100%)`,
      }}
    >
      <style>{`
        @keyframes ss-dim-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.55; } }
        /* Ambient motion is killed in CSS as well as JS. The JS flag
           (useReducedMotion) cannot be known during SSR, so relying on it
           alone leaves the first painted frame animating; this media query is
           authoritative and needs no hydration branch. */
        @media (prefers-reduced-motion: reduce) {
          .ss-anim { animation: none !important; }
        }
      `}</style>

      {/* Dim seeded stars */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {stars.map((p, i) => (
          <span
            key={i}
            className="ss-anim absolute h-0.5 w-0.5 rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: "var(--sand)",
              opacity: 0.3,
              animation: reduced
                ? "none"
                : `ss-dim-twinkle ${(p.duration + 1.5).toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      <Reveal className="relative z-10 mx-auto max-w-2xl text-center">
        <p
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontSize: "17px",
            color: "var(--sand)",
          }}
        >
          The countdown
        </p>

        {config.countdownTo && (
          <div
            role="timer"
            aria-label={`Countdown to ${config.recipient}'s surprise`}
            className="mx-auto mt-6 flex max-w-md justify-center gap-3"
          >
            {units.map((unit) => (
              <div key={unit.label} className="min-w-16">
                <p
                  style={{
                    fontFamily: SERIF_STACK,
                    fontSize: "clamp(32px, 8vw, 44px)",
                    lineHeight: 1,
                    color: "var(--sand)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {unit.value}
                </p>
                {/* The mockup labels these in --stone; stone on ink measures
                    1.9:1, so this ships sand dimmed to 75% (~5:1) instead. */}
                <p
                  className="mt-1.5 text-[10px] uppercase"
                  style={{
                    letterSpacing: "0.14em",
                    color: "rgba(204,172,159,0.75)",
                  }}
                >
                  {unit.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <p
          className="mt-8"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            fontSize: "clamp(26px, 6vw, 30px)",
            lineHeight: 1.1,
            color: "var(--paper)",
          }}
        >
          See you there.
        </p>
      </Reveal>
    </section>
  );
}
