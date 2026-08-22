"use client";

import type { StoryConfig, StoryEvent } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  FOCUS_RING_CLASS,
  SEAM_MESSAGE_TO_PLAN,
  SEAM_PLAN_TO_POLAROID,
  SERIF_STACK,
} from "./shared";

interface PlanSceneProps {
  config: StoryConfig;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** `.plq` from the mockup: paper card, mist hairline, left-aligned key/value. */
function Plaque({ event }: { event: StoryEvent }) {
  return (
    <div
      className="mx-auto w-full max-w-[330px] rounded-xl px-5 py-4 text-left"
      style={{
        backgroundColor: "var(--paper)",
        border: "1px solid var(--mist)",
        boxShadow: "0 1px 3px rgba(26,26,26,.08)",
      }}
    >
      <p
        className="text-[11px] uppercase"
        style={{ letterSpacing: "0.1em", color: "var(--stone)" }}
      >
        {event.label}
      </p>
      <p
        className="mt-1"
        style={{ fontFamily: SERIF_STACK, fontSize: "18px", color: "var(--ink)" }}
      >
        {event.title}
      </p>
      {event.detail && (
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--stone)" }}>
          {event.detail}
        </p>
      )}
      {event.mapsQuery && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(event.mapsQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`ed-tlink mt-3 inline-block text-xs ${FOCUS_RING_CLASS}`}
        >
          See the route →
        </a>
      )}
    </div>
  );
}

/**
 * Scene 3 — the plan, one plaque per event (`.s-plan` in the mockup: pebble
 * ground, italic serif caption, stacked paper plaques).
 *
 * GRADIENT SEAM CONTRACT: first stop #FFFEFD (SEAM_MESSAGE_TO_PLAN) ===
 * MessageScene's final stop; final stop #F5F0ED (SEAM_PLAN_TO_POLAROID) ===
 * PolaroidScene's first stop.
 */
export default function PlanScene({ config }: PlanSceneProps) {
  const events: StoryEvent[] =
    config.events.length > 0
      ? config.events
      : config.countdownTo
        ? [{ label: "When", title: formatWhen(config.countdownTo) }]
        : [];

  if (events.length === 0) return null;

  return (
    <section
      aria-label="The plan"
      className="relative px-6 py-28"
      style={{
        background:
          "radial-gradient(80% 36% at 50% 0%, rgba(212, 88, 71, 0.07), transparent 70%), " +
          `linear-gradient(180deg, ${SEAM_MESSAGE_TO_PLAN} 0%, ${SEAM_PLAN_TO_POLAROID} 100%)`,
      }}
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "17px",
            color: "var(--stone)",
          }}
        >
          The plan
        </h2>
        <div className="mt-6 space-y-3">
          {events.map((event, i) => (
            <Plaque key={i} event={event} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
