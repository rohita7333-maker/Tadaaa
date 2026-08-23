/**
 * A1's welcome panes and A3's onboarding picks.
 *
 * Everything a user chooses here only BIASES template ordering — Skip is live
 * on every step and nothing downstream is gated on it. That is the handoff's
 * rule and it is the reason these are stored as plain occasion ids in
 * `profiles.occasions[]` rather than as a preferences blob: a value that only
 * sorts a list does not deserve its own shape.
 */
import { HANDOFF_OCCASIONS } from "./occasions";

// ---------------------------------------------------------------------------
// A1
// ---------------------------------------------------------------------------

export interface WelcomePane {
  headline: string;
  body: string;
}

/**
 * Three panes. Only photo, headline and body change between them — the auth
 * buttons are pinned and never move, which is the whole point of the frame.
 */
export const WELCOME_PANES: readonly WelcomePane[] = [
  {
    headline: "A surprise designed to be opened.",
    body: "Collect messages from everyone who loves them. Send one link.",
  },
  {
    headline: "Everyone piles on.",
    body: "Friends add words and photos. You approve every one before it shows.",
  },
  {
    headline: "They open it. You watch.",
    body: "A push the moment they tap it, and every reaction after.",
  },
] as const;

/** Clamped: a swipe that overshoots must not blank the headline. */
export function welcomePane(index: number): WelcomePane {
  const i = Math.min(WELCOME_PANES.length - 1, Math.max(0, index));
  return WELCOME_PANES[i];
}

// ---------------------------------------------------------------------------
// A3
// ---------------------------------------------------------------------------

/**
 * A shortcut, not an occasion. It is never persisted — a value in
 * `profiles.occasions[]` that no template can match is a value that quietly
 * does nothing forever.
 */
export const ALL_OF_IT = "__all__";

export interface CelebrateChip {
  id: string;
  label: string;
}

export const CELEBRATE_CHIPS: readonly CelebrateChip[] = [
  { id: "birthday", label: "Birthdays" },
  { id: "anniversary", label: "Anniversaries" },
  { id: "festival", label: "Festivals" },
  { id: "date", label: "Date nights" },
  { id: "apology", label: "Apologies" },
  { id: ALL_OF_IT, label: "All of it" },
] as const;

const REAL_IDS = CELEBRATE_CHIPS.filter((c) => c.id !== ALL_OF_IT).map((c) => c.id);

/** Multi-select. "All of it" fills or clears the rest in one tap. */
export function toggleChip(selected: readonly string[], id: string): string[] {
  if (id === ALL_OF_IT) {
    const everything = REAL_IDS.every((real) => selected.includes(real));
    return everything ? [] : [...REAL_IDS];
  }
  return selected.includes(id)
    ? selected.filter((s) => s !== id)
    : [...selected, id];
}

/** What actually gets written to `profiles.occasions[]`. */
export function toOccasionIds(selected: readonly string[]): string[] {
  const valid = new Set(HANDOFF_OCCASIONS.map((o) => o.id));
  const out: string[] = [];
  for (const id of selected) {
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/** A3's three 26×3 bars: celebrate, who, notifications. */
export const ONBOARDING_STEPS = ["celebrate", "who", "notifications"] as const;

export function onboardingProgress(step: number): boolean[] {
  const clamped = Math.min(ONBOARDING_STEPS.length, Math.max(1, step));
  return ONBOARDING_STEPS.map((_, i) => i < clamped);
}
