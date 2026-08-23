/**
 * Frame B2 — surprise detail header + moderation strings.
 *
 * The frame is specific about wording ("Birthday · Scroll story",
 * "Live · expires in 24 days", "2 messages waiting on you", "Aanya and Rahul
 * added words"), so the strings live here with tests rather than being
 * assembled inline in JSX where nothing checks them.
 */
import { occasionLabel } from "./occasions";
import type { InviteStatus } from "./invite-status";

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Reveal style
// ---------------------------------------------------------------------------

/**
 * Production `reveal_type` -> the handoff's display name (C4 tile names).
 * Unknown values fall back to Tap, matching `schema-adapter.toRevealStyle`:
 * `reveal_type` is TEXT with a CHECK, so a value added server-side before the
 * app ships must degrade to a renderable label rather than blank the header.
 */
const REVEAL_LABELS: Record<string, string> = {
  scroll_story: "Scroll story",
  tap: "Tap to reveal",
  countdown: "Countdown",
  letters: "Open-when letters",
};

export function revealStyleLabel(revealType: string | null | undefined): string {
  return REVEAL_LABELS[revealType ?? ""] ?? REVEAL_LABELS.tap;
}

/** "Birthday · Scroll story". Rendered uppercase by `type.revealMicroLabel`. */
export function detailEyebrow(
  occasionType: string | null | undefined,
  revealType: string | null | undefined
): string {
  const occasion = occasionLabel(occasionType);
  const style = revealStyleLabel(revealType);
  return occasion ? `${occasion} · ${style}` : style;
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------

export interface DetailStatusInput {
  status: InviteStatus;
  expiresAt: string | null;
  countdownDate?: string | null;
}

/** Whole days from now until `iso`, rounded down. Negative once past. */
function daysUntil(iso: string, now: number): number {
  return Math.floor((new Date(iso).getTime() - now) / DAY_MS);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * "Live · expires in 24 days" · "Opens in 3 days" · "Expired" · "Paused".
 *
 * The expiry clause is dropped entirely when `expires_at` is null — a link that
 * never expires must not read "expires in NaN days", which is what a naive
 * template produces for the majority of production rows (expires_at is
 * nullable and frequently unset).
 */
export function detailStatusLine(
  input: DetailStatusInput,
  now: number = Date.now()
): string {
  if (input.status === "expired") return "Expired";
  if (input.status === "archived") return "Paused";

  if (input.status === "scheduled") {
    if (!input.countdownDate) return "Scheduled";
    const d = daysUntil(input.countdownDate, now);
    if (d <= 0) return "Opens today";
    return `Opens in ${plural(d, "day", "days")}`;
  }

  if (!input.expiresAt) return "Live";
  const d = daysUntil(input.expiresAt, now);
  if (d <= 0) return "Live · expires today";
  return `Live · expires in ${plural(d, "day", "days")}`;
}

// ---------------------------------------------------------------------------
// Moderation card
// ---------------------------------------------------------------------------

export interface PendingContributor {
  name: string;
}

export interface ModerationSummary {
  title: string;
  detail: string;
}

/** contributor_name is nullable and may be whitespace; never render a gap. */
function displayName(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === "" ? "Someone" : trimmed;
}

/**
 * The coral-bordered card on B2 / B4. Returns null when nothing is waiting —
 * the card is conditional, and an empty "0 messages waiting on you" is worse
 * than no card at all.
 */
export function moderationSummary(
  pending: readonly PendingContributor[]
): ModerationSummary | null {
  if (pending.length === 0) return null;

  const names = pending.map((p) => displayName(p.name));
  let detail: string;
  if (names.length === 1) {
    detail = `${names[0]} added words`;
  } else if (names.length === 2) {
    detail = `${names[0]} and ${names[1]} added words`;
  } else {
    const rest = names.length - 2;
    detail = `${names[0]}, ${names[1]} and ${plural(rest, "other", "others")} added words`;
  }

  return {
    title: `${plural(pending.length, "message", "messages")} waiting on you`,
    detail,
  };
}

// ---------------------------------------------------------------------------
// Moderation status
// ---------------------------------------------------------------------------

export type ModerationStatus = "pending" | "approved" | "rejected";

const MODERATION_VALUES: readonly string[] = ["pending", "approved", "rejected"];

/**
 * `invite_contributions` carries BOTH `approved boolean` (original) and
 * `moderation_status text` (added by the phase-0 migration). Rows written
 * before the column existed have it null, so the boolean is the fallback —
 * without which every historical contribution reads as pending and the
 * moderation queue never empties.
 *
 * A value outside the CHECK constraint is ignored rather than trusted: the
 * column is TEXT, and rendering an unknown state as if it were meaningful is
 * how a rejected message finds its way back in front of a recipient.
 */
export function toModerationStatus(row: {
  moderation_status?: string | null;
  approved?: boolean | null;
}): ModerationStatus {
  const explicit = row.moderation_status;
  if (explicit && MODERATION_VALUES.includes(explicit)) {
    return explicit as ModerationStatus;
  }
  return row.approved === true ? "approved" : "pending";
}
