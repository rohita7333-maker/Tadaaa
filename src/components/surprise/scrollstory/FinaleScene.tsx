"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { particleLayout } from "@/lib/scroll-story/seeded";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  HANDWRITING_STACK,
  SEAM_RSVP_TO_FINALE,
  SERIF_STACK,
} from "./shared";

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
 * Scene 6 — night sky finale with a live countdown.
 * GRADIENT SEAM CONTRACT: first stop #9B3D42 (SEAM_RSVP_TO_FINALE) ===
 * RsvpScene's final stop.
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
    { label: "days", value: remaining ? pad(remaining.days) : "00" },
    { label: "hours", value: remaining ? pad(remaining.hours) : "00" },
    { label: "mins", value: remaining ? pad(remaining.minutes) : "00" },
    { label: "secs", value: remaining ? pad(remaining.seconds) : "00" },
  ];

  return (
    <section
      aria-label="The countdown"
      className="relative overflow-hidden px-6 py-32"
      style={{
        background: `linear-gradient(180deg, ${SEAM_RSVP_TO_FINALE} 0%, #3E3330 26%, #231F1D 55%, #181513 100%)`,
      }}
    >
      <style>{`
        @keyframes ss-dim-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.55; } }
      `}</style>

      {/* Dim seeded stars */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {stars.map((p, i) => (
          <span
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-cream"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 0.3,
              animation: reduced
                ? "none"
                : `ss-dim-twinkle ${(p.duration + 1.5).toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      <Reveal className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          the countdown begins
        </p>

        {config.countdownTo && (
          <div
            role="timer"
            aria-label={`Countdown to ${config.recipient}'s surprise`}
            className="mx-auto mt-8 grid max-w-md grid-cols-4 gap-3"
          >
            {units.map((unit) => (
              <div
                key={unit.label}
                className="rounded-[18px] px-2 py-4"
                style={{
                  backgroundColor: "rgba(255,248,240, 0.07)",
                  border: "1px solid rgba(201,169,110, 0.4)",
                }}
              >
                <p
                  className="text-3xl text-gold-light tabular-nums"
                  style={{
                    fontFamily: SERIF_STACK,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {unit.value}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-cream/60">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <p
          className="mt-14 text-cream"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 600,
            fontSize: "clamp(40px, 9vw, 72px)",
            lineHeight: 1.05,
          }}
        >
          Yaaay! 🎉
        </p>
        <p
          className="mt-3 text-gold-light"
          style={{ fontFamily: HANDWRITING_STACK, fontSize: "clamp(24px, 4vw, 32px)" }}
        >
          see you there
        </p>

        <p className="mt-20 text-xs text-cream/40">
          made with TaDaaaa · © 2026
        </p>
      </Reveal>
    </section>
  );
}
