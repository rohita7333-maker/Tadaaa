/**
 * The PIN-gated reveal payload.
 *
 * WHY THIS EXISTS
 *
 * D1's promise is "four digits before anything shows". Until 2026-08-17 the PIN
 * was verified but nothing was gated on it: `get_invite_by_slug` and its child
 * readers never looked at `pin_hash`, so an anon caller holding only the slug
 * got the title, message, questions, photos and letters with one curl. Proven
 * live before this module was written.
 *
 * Those five readers now WITHHOLD a PIN-locked invite entirely, and this is the
 * other half: one `get_invite_reveal(slug, pin)` round trip that verifies the
 * PIN server-side and returns everything at once. One call, so a locked reveal
 * cannot half-load — and no path exists where the client decides what the
 * recipient is allowed to see.
 */
import type { InviteContribution, InvitePhoto, InviteQuestion, RevealData } from "./db";
import type { LetterRow } from "./letters";

export type RevealBundleCode = "pin_required" | "rate_limited" | "unavailable";

export type RevealBundleResult =
  | { ok: true; data: RevealData; letters: LetterRow[] }
  | { ok: false; code: RevealBundleCode };

const FAILED = (code: RevealBundleCode): RevealBundleResult => ({ ok: false, code });

const KNOWN_CODES: readonly string[] = ["pin_required", "rate_limited", "unavailable"];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Server jsonb -> the shape the reveal screen already consumes.
 *
 * Every failure is a NAMED code. "Wrong PIN" and "this link is dead" are two
 * different screens, and collapsing them tells a recipient who fat-fingered a
 * digit that their surprise no longer exists.
 */
export function parseRevealBundle(raw: unknown): RevealBundleResult {
  if (!raw || typeof raw !== "object") return FAILED("unavailable");
  const body = raw as Record<string, unknown>;

  if (body.ok !== true) {
    const code = typeof body.code === "string" ? body.code : "";
    // An unrecognised code must not reach the UI raw — a recipient should never
    // read a server enum.
    return FAILED(KNOWN_CODES.includes(code) ? (code as RevealBundleCode) : "unavailable");
  }

  const invite = body.invite;
  // ok:true with no invite is not a success, whatever the flag says.
  if (!invite || typeof invite !== "object") return FAILED("unavailable");

  return {
    ok: true,
    data: {
      invite: invite as RevealData["invite"],
      questions: asArray<InviteQuestion>(body.questions),
      photos: asArray<InvitePhoto>(body.photos),
      contributions: asArray<InviteContribution>(body.contributions),
    },
    letters: asArray<LetterRow>(body.letters),
  };
}

/**
 * What the gate says when it refuses. Deliberately says nothing about the PIN's
 * length, shape or value — the hint the creator wrote is the only clue anyone
 * gets, and it is shown separately.
 */
export const PIN_GATE_COPY: Record<RevealBundleCode, string> = {
  pin_required: "Not quite. Try again.",
  rate_limited: "Too many tries. Give it a minute.",
  unavailable: "This surprise isn't available any more.",
};
