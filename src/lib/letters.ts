/**
 * D5 — Open-when letters: data layer.
 *
 * Letters are read through `get_invite_letters`, a SECURITY DEFINER reader, for
 * the same reason every other reveal read goes through one: the restrictive RLS
 * policies collapse `letters` to zero rows for a guest, and a guest is exactly
 * who opens a reveal.
 *
 * The reader also enforces the rule the UI cannot: a date-locked letter comes
 * back with `body = null`. Withholding it client-side would leave the real text
 * one devtools tab away, which makes "Unlocks 14 Sep" decoration rather than a
 * lock.
 */
import { supabase } from "./supabase";

export interface LetterRow {
  id: string;
  label: string;
  position: number;
  unlock_at: string | null;
  opened_at: string | null;
  /** Server-computed. Authoritative — never recompute from the device clock. */
  locked: boolean;
  /** Null while `locked`. The server withholds it. */
  body: string | null;
}

/** Frame D5's four row states. `opening` is a transition the list owns. */
export type LetterState = "sealed" | "opened" | "locked" | "opening";

/**
 * `locked` comes from the server, not from comparing `unlock_at` to
 * `Date.now()`. A device with a wrong date must not be able to talk itself into
 * an unlock — and since the body is already withheld, a client that disagreed
 * would render an empty letter rather than a locked one.
 */
export function classifyLetter(row: LetterRow): LetterState {
  // Opened wins over locked: it already happened, and "Unlocks 14 Sep" on a
  // letter the recipient has read reads as a bug.
  if (row.opened_at) return "opened";
  if (row.locked) return "locked";
  return "sealed";
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/** Frame D5's state line, under the label. */
export function letterStateLine(row: LetterRow, now: Date = new Date()): string {
  const state = classifyLetter(row);

  if (state === "opened" && row.opened_at) {
    const days = daysBetween(new Date(row.opened_at), now);
    if (days <= 0) return "Opened today";
    if (days === 1) return "Opened yesterday";
    return `Opened ${days} days ago`;
  }

  if (state === "locked" && row.unlock_at) {
    const when = new Date(row.unlock_at);
    const label = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(when);
    return `Unlocks ${label}`;
  }

  return "Open when it's right";
}

export async function getLetters(
  slug: string,
  /**
   * `get_invite_letters` now withholds a PIN-locked invite's letters entirely.
   * When the recipient has already cleared the gate, the reveal screen hands
   * the shelf down from the bundle instead of calling this at all — so a
   * non-null PIN here means "re-read after an open", and it goes through the
   * gated bundle.
   */
  pin: string | null = null,
): Promise<LetterRow[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: LetterRow[] | null; error: unknown }>;

  if (pin) {
    const bundle = await rpc("get_invite_reveal", { p_slug: slug, p_pin: pin }) as unknown as {
      data: { ok?: boolean; letters?: LetterRow[] } | null;
      error: unknown;
    };
    if (bundle.error || !bundle.data?.ok) return [];
    return bundle.data.letters ?? [];
  }

  const { data, error } = await rpc("get_invite_letters", { p_slug: slug });
  // A failed read is an empty shelf, not a crash — the reveal still renders its
  // frame and the recipient can retry.
  if (error || !data) return [];
  // Order is the server's (`order by position`). Re-sorting here would silently
  // diverge the moment the creator reorders them.
  return data;
}

/**
 * Mark a letter opened. Idempotent server-side: the second call returns the
 * FIRST `opened_at`, so "Opened 3 days ago" does not reset to today every time
 * the recipient revisits.
 */
export async function openLetter(
  letterId: string,
  /**
   * The PIN the recipient already cleared, when the surprise has one.
   *
   * `open_invite_letter(uuid)` now REFUSES a letter whose parent is PIN-locked
   * — otherwise the gate would be a doorway with the wall missing beside it:
   * anyone holding a letter id could stamp `opened_at` and read the body
   * without ever seeing the keypad. The two-argument overload re-verifies.
   */
  pin: string | null = null,
): Promise<string | null> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: { ok?: boolean; opened_at?: string } | null; error: unknown }>;

  const { data, error } = await rpc("open_invite_letter", {
    p_letter_id: letterId,
    p_pin: pin,
  });
  if (error || !data?.ok) return null;
  return data.opened_at ?? null;
}
