/**
 * config.ts — Scroll Story reveal configuration (mobile).
 *
 * Mirrors web `surprise-invite/src/lib/scroll-story/config.ts` 1:1 so an
 * invite created on either surface renders the same story shape.
 */

export interface StoryEvent {
  label: string;
  title: string;
  detail?: string;
  mapsQuery?: string;
}

export interface StoryPhoto {
  src?: string;
  caption?: string;
  rotationDeg?: number;
}

export interface StoryConfig {
  /** Seed for deterministic particle layout. */
  slug: string;
  recipient: string;
  eyebrow: string;
  occasionLine: string;
  sender?: string;
  message: string;
  events: StoryEvent[];
  photos: StoryPhoto[];
  /** ISO datetime the finale counts down to. */
  countdownTo?: string;
  tier: "free" | "paid";
}

/** Demo story — Maya's surprise thirtieth. 2026-10-24 is a Saturday. */
export const demoConfig: StoryConfig = {
  slug: "demo",
  recipient: "Maya",
  eyebrow: "a surprise for",
  occasionLine: "turns thirty",
  sender: "Dev",
  message:
    "Thirty years of you making every room warmer just by walking into it. Give me one golden evening — no phones, no plans, just us and the good light.",
  events: [
    {
      label: "When",
      title: "Saturday, October 24 · 5:30 PM",
      detail: "golden hour, sharp",
      mapsQuery: "Sunset Terrace, Jubilee Hills, Hyderabad",
    },
  ],
  photos: [
    { caption: "your 25th, remember?", rotationDeg: -6 },
    { caption: "that rooftop monsoon", rotationDeg: 5 },
    { caption: "wrong turn, best day", rotationDeg: -3 },
    { caption: "us, obviously", rotationDeg: 7 },
  ],
  countdownTo: "2026-10-24T17:30:00",
  tier: "free",
};
