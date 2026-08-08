/**
 * shared.ts — Scroll Story shared style constants (mobile).
 *
 * GRADIENT SEAM CONTRACT: each scene's first gradient stop EXACTLY equals the
 * previous scene's final stop, reusing the same seam hex chain as web
 * (`surprise-invite/src/components/surprise/scrollstory/shared.ts`) so the
 * day→night handoff is seamless.
 */
import { fonts } from "@/theme/tokens";

/** Serif-ish heading font — reuses the app's Bricolage heading token. */
export const SERIF_FONT = fonts.heading;
/** Handwritten accent font — reuses the app's Caveat token. */
export const HAND_FONT = fonts.hand;

/** Brand confetti/lantern palette. */
export const BRAND_PARTY_COLORS = [
  "#C4686D", // rose
  "#E8A5A8", // rose-light
  "#C9A96E", // gold
  "#E8D5A8", // gold-light
  "#9B3D42", // rose-deep
] as const;

// --- Gradient seam values (scene N final stop === scene N+1 first stop) ---
/** SkyHero final stop → MessageScene first stop. */
export const SEAM_SKY_TO_MESSAGE = "#E8D5A8";
/** MessageScene final stop → PlanScene first stop. */
export const SEAM_MESSAGE_TO_PLAN = "#FFF8F0";
/** PlanScene final stop → PolaroidScene first stop. */
export const SEAM_PLAN_TO_POLAROID = "#F5EDE3";
/** PolaroidScene final stop (blush) → RsvpScene first stop. */
export const SEAM_POLAROID_TO_RSVP = "#E8A5A8";
/** RsvpScene final stop → FinaleScene first stop. */
export const SEAM_RSVP_TO_FINALE = "#9B3D42";
/** FinaleScene deep night stop. */
export const FINALE_NIGHT = "#181513";

/** Deterministic pseudo-random in [0,1) — same generator as Particles.tsx so
 * seeded layouts are stable across re-renders without pulling in a new dep. */
export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 99.13) * 43758.5453;
  return x - Math.floor(x);
}

export interface ParticleSpec {
  x: number;
  y: number;
  scale: number;
  duration: number;
  delay: number;
}

/** Deterministic particle layout seeded from a string + index, ported from
 * web's `particleLayout` seeded helper (percent-based x/y for RN's percentage
 * layout support). */
export function particleLayout(
  seed: string,
  count: number,
  opts: { minX?: number; maxX?: number; minY?: number; maxY?: number } = {}
): ParticleSpec[] {
  const { minX = 0, maxX = 100, minY = 0, maxY = 100 } = opts;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return Array.from({ length: count }, (_, i) => {
    const base = hash + i * 17;
    return {
      x: minX + pseudoRandom(base) * (maxX - minX),
      y: minY + pseudoRandom(base + 1) * (maxY - minY),
      scale: 0.7 + pseudoRandom(base + 2) * 0.6,
      duration: 2.4 + pseudoRandom(base + 3) * 2.8,
      delay: pseudoRandom(base + 4) * 3,
    };
  });
}
