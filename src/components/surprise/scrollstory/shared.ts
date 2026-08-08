/**
 * shared.ts — Scroll Story shared style constants.
 *
 * GRADIENT SEAM CONTRACT: each scene's first gradient stop EXACTLY equals
 * the previous scene's final stop. Seam values live here so both sides of
 * every boundary reference one constant.
 */

/** Serif stack for story headings/body (repo heading font is a grotesque). */
export const SERIF_STACK = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

/** Caveat handwriting var from globals.css (--font-caveat). */
export const HANDWRITING_STACK = 'var(--font-caveat), "Segoe Script", cursive';

/** 3px rose focus-visible ring for buttons/links. */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-[#C4686D] focus-visible:outline-offset-2";

/** Brand confetti/flag palette. */
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
