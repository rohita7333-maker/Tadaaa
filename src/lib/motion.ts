/**
 * Motion tokens — ported from web src/lib/motion.ts, adapted for Reanimated.
 * Easings are cubic-bezier control points usable with Reanimated's Easing.bezier.
 * Durations are in MILLISECONDS (Reanimated) — the web values were seconds.
 */
import { Easing, ReduceMotion } from "react-native-reanimated";

export const beziers = {
  entrance: [0.22, 1, 0.36, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  springSoft: [0.34, 1.56, 0.64, 1] as const,
  springBouncy: [0.4, 2, 0.3, 1] as const,
};

export const easings = {
  entrance: Easing.bezier(...beziers.entrance),
  exit: Easing.bezier(...beziers.exit),
  springSoft: Easing.bezier(...beziers.springSoft),
  springBouncy: Easing.bezier(...beziers.springBouncy),
};

/** Durations in ms (web values × 1000). */
export const durations = {
  instant: 120,
  quick: 200,
  base: 350,
  slow: 600,
  cinematic: 900,
  ambient: 2800,
  floatA: 3000,
  floatB: 4000,
  floatC: 3500,
};

/** Stagger offsets in ms. */
export const staggers = {
  lead: 0,
  word: 40,
  support: 60,
  detail: 100,
};

/** Reanimated spring configs — press feedback + reveal unwrap. */
export const springs = {
  soft: { stiffness: 260, damping: 22, mass: 1 },
  weighty: { stiffness: 140, damping: 18, mass: 1.1 },
};

/** Respect the OS reduce-motion setting inside Reanimated animations. */
export const reduceMotion = ReduceMotion.System;
