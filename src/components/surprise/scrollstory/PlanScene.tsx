"use client";

import type { StoryConfig, StoryEvent } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  FOCUS_RING_CLASS,
  HANDWRITING_STACK,
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

function Plaque({ event }: { event: StoryEvent }) {
  return (
    <div
      className="relative mx-auto w-full max-w-md rounded-[38px] px-8 py-9 text-center shadow-[0_18px_44px_rgba(45,41,38,0.12)]"
      style={{
        background: "linear-gradient(160deg, #FDF6E8 0%, #E8D5A8 100%)",
        border: "1px solid rgba(201,169,110, 0.65)",
      }}
    >
      {/* Emoji flower clusters overlapping opposite corners */}
      <span aria-hidden="true" className="absolute -left-3 -top-4 text-2xl">
        🌸🌼
      </span>
      <span aria-hidden="true" className="absolute -bottom-4 -right-3 text-2xl">
        💐🌺
      </span>

      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-deep">
        {event.label}
      </p>
      <p
        className="mt-3 text-charcoal"
        style={{ fontFamily: SERIF_STACK, fontSize: "24px", lineHeight: 1.3 }}
      >
        {event.title}
      </p>
      {event.detail && (
        <p className="mt-2 italic text-warm-gray">{event.detail}</p>
      )}
      {event.mapsQuery && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(event.mapsQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 inline-block rounded-full font-medium text-rose-deep underline underline-offset-4 ${FOCUS_RING_CLASS}`}
        >
          See the route →
        </a>
      )}
    </div>
  );
}

/**
 * Scene 3 — the plan, one gold-cream plaque per event.
 * GRADIENT SEAM CONTRACT: first stop #FFF8F0 (SEAM_MESSAGE_TO_PLAN) ===
 * MessageScene's final stop; final stop #F5EDE3 (SEAM_PLAN_TO_POLAROID) ===
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
          "radial-gradient(80% 36% at 50% 0%, rgba(196,104,109, 0.12), transparent 70%), " +
          `linear-gradient(180deg, ${SEAM_MESSAGE_TO_PLAN} 0%, ${SEAM_PLAN_TO_POLAROID} 100%)`,
      }}
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p
          className="text-rose-deep"
          style={{ fontFamily: HANDWRITING_STACK, fontSize: "26px" }}
        >
          here&apos;s the plan ✨
        </p>
        <h2
          className="mt-1 text-charcoal"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 600,
            fontSize: "clamp(32px, 6vw, 44px)",
            letterSpacing: "0",
          }}
        >
          The plan
        </h2>
        <div className="mt-10 space-y-10">
          {events.map((event, i) => (
            <Plaque key={i} event={event} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
