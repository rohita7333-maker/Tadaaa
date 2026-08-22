/**
 * shared.ts — Scroll Story shared style constants (web).
 *
 * GRADIENT SEAM CONTRACT: each scene's first gradient stop EXACTLY equals
 * the previous scene's final stop. Seam values live here so both sides of
 * every boundary reference one constant.
 *
 * CROSS-PLATFORM CONTRACT (read before editing): the six colour constants at
 * the bottom of this file — the five seams plus FINALE_NIGHT — are byte-locked
 * to mobile's twin file,
 * `tadaaaa/mobile/src/components/reveal/scrollstory/shared.ts`.
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
 * `src/lib/design-tokens.ts`; none is invented.
 */

/** Editorial headline face — the `--head` token declared in globals.css. */
export const SERIF_STACK = "var(--head)";

/** Body face — the `--body` token. Cursive is banned by the editorial identity. */
export const HANDWRITING_STACK = "var(--body)";

/** Coral focus-visible ring, matching the mockup's `:focus-visible` rule
 * (`outline:2px solid var(--coral); outline-offset:2px`). */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#D45847] focus-visible:outline-offset-2";

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
// Byte-locked to mobile. See CROSS-PLATFORM CONTRACT above.
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
