/**
 * motion.ts — Shared motion token system for TaDaaaa.
 *
 * Single "hand" so every surface feels authored by one person.
 * Import from here instead of writing inline magic numbers.
 *
 * CSS vars matching these tokens live in src/app/globals.css.
 */

import type { Transition } from "framer-motion";
import { getReducedMotionTransition } from "./a11y";

// ---------------------------------------------------------------------------
// Easing — 4-tuple arrays for framer-motion `ease` prop
// ---------------------------------------------------------------------------
export const easings = {
  /** Expo-out. Things arriving. Matches --ease-entrance. */
  entrance: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Accelerate away. Matches --ease-exit. */
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  /** Gentle overshoot. Matches --ease-spring-soft. */
  springSoft: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  /** Pronounced overshoot. Reserve for hero "touch" beats. Matches --ease-spring-bouncy. */
  springBouncy: [0.4, 2, 0.3, 1] as [number, number, number, number],
} as const;

// ---------------------------------------------------------------------------
// CSS easing strings — for use in `transition` style prop (not framer-motion)
// ---------------------------------------------------------------------------
export const cssEasings = {
  entrance: "cubic-bezier(0.22, 1, 0.36, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  springSoft: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  springBouncy: "cubic-bezier(0.4, 2, 0.3, 1)",
} as const;

// ---------------------------------------------------------------------------
// Duration scale (seconds)
// ---------------------------------------------------------------------------
export const durations = {
  instant: 0.12,
  quick: 0.2,
  base: 0.35,
  slow: 0.6,
  cinematic: 0.9,
  /** Ambient / looping motion — 2.5–4s range. Never use for one-shot transitions. */
  ambient: 2.8,
} as const;

// ---------------------------------------------------------------------------
// Stagger hierarchy (delay offsets in seconds)
// Vary by content role — not a uniform drip on everything.
// ---------------------------------------------------------------------------
export const staggers = {
  /** First element — no delay. */
  lead: 0,
  /** Per-word offset for word-by-word reveals (title blur cadence). */
  word: 0.04,
  /** Secondary / supporting elements. */
  support: 0.06,
  /** Body copy, detail content. */
  detail: 0.10,
} as const;

// ---------------------------------------------------------------------------
// Framer-motion spring configs — for gesture / interactive elements
// ---------------------------------------------------------------------------
export const springs = {
  /** Buttons, cards, press feedback. */
  soft: { type: "spring" as const, stiffness: 260, damping: 22 },
  /** Reveal "unwrap" — anticipation + settle. */
  weighty: { type: "spring" as const, stiffness: 140, damping: 18, mass: 1.1 },
} as const;

// ---------------------------------------------------------------------------
// Reduced-motion factory — extend getReducedMotionTransition with a
// meaningful fallback instead of the raw `{ duration: 0 }` scatter.
// ---------------------------------------------------------------------------

export { getReducedMotionTransition };

/**
 * Returns a transition that respects prefers-reduced-motion.
 * Unlike the raw helper in a11y.ts, the default reduced path uses
 * `durations.instant` (opacity-only) rather than `duration: 0`.
 */
export function makeReducedMotionTransition(
  shouldReduce: boolean | null | undefined,
  normal: Transition,
  reduced: Transition = { duration: durations.instant }
): Transition {
  return getReducedMotionTransition(shouldReduce, normal, reduced);
}
