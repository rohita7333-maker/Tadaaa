/**
 * shared.ts — Scroll Story shared style constants (mobile).
 *
 * GRADIENT SEAM CONTRACT: each scene's first gradient stop EXACTLY equals the
 * previous scene's final stop.
 *
 * CROSS-PLATFORM CONTRACT (read before editing): the six colour constants
 * below — the five seams plus FINALE_NIGHT — are byte-locked to web's twin
 * file, `surprise-invite/src/components/surprise/scrollstory/shared.ts`.
 * The same invite must render the same journey on web and on phone, so a
 * change here is only ever half a change. Both platforms pin the literals in
 * `shared.seams.test.ts`, so editing one side alone breaks that side's suite.
 *
 * THE JOURNEY: the chain is a designed arc through the editorial palette, not
 * a per-scene colour pick. Night (ink) opens, the horizon warms to sand, the
 * day breaks onto paper, settles onto pebble, flattens to mist, drops into night
 * inside the RSVP and flares coral as
 * the RSVP is answered — the one place the brand accent is allowed to shout — and then
 * falls back to ink for the finale. Every value is a palette primitive from
 * `src/theme/tokens.ts`; none is invented.
 */
import { fonts } from "@/theme/tokens";

/** Editorial headline face — reuses the app's heading token. */
export const SERIF_FONT = fonts.heading;
/** Accent face — the cursive token is retired, so this is the body face. */
export const HAND_FONT = fonts.hand;

/**
 * Celebration palette — the mockup's `burst()` colours verbatim
 * (`tadaaaa-editorial.html`: `["#D45847","#CCAC9F","#1A1A1A","#F5F0ED"]`),
 * i.e. coral · sand · ink · pebble. Paper confetti, not emoji.
 */
export const BRAND_PARTY_COLORS = [
  "#D45847", // coral
  "#CCAC9F", // sand
  "#1A1A1A", // ink
  "#F5F0ED", // pebble
] as const;

// --- Gradient seam values (scene N final stop === scene N+1 first stop) ---
// Byte-locked to web. See CROSS-PLATFORM CONTRACT above.
/** SkyHero final stop → MessageScene first stop. Sand: the dawn horizon. */
export const SEAM_SKY_TO_MESSAGE = "#CCAC9F";
/** MessageScene final stop → PlanScene first stop. Paper: full daylight. */
export const SEAM_MESSAGE_TO_PLAN = "#FFFEFD";
/** PlanScene final stop → PolaroidScene first stop. Pebble: warm stone. */
export const SEAM_PLAN_TO_POLAROID = "#F5F0ED";
/**
 * PolaroidScene final stop → RsvpScene first stop. Mist: the light going flat.
 *
 * Deliberately a LIGHT value even though RsvpScene reads as a dark scene. Plan
 * and Polaroid are the two optional scenes (no events / no photos → they return
 * null), so this seam is also what MessageScene or PlanScene hands off to when
 * one of them is skipped. Keeping it inside the paper/pebble/mist family makes
 * every skipped-scene handoff an imperceptible step instead of a hard edge; the
 * descent into night then happens INSIDE RsvpScene, which always renders.
 */
export const SEAM_POLAROID_TO_RSVP = "#E8E4E0";
/** RsvpScene final stop → FinaleScene first stop. Coral: the flare. */
export const SEAM_RSVP_TO_FINALE = "#D45847";
/** FinaleScene terminal stop. Ink: night. */
export const FINALE_NIGHT = "#1A1A1A";

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
