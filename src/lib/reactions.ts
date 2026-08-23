/**
 * D2's reaction bar.
 *
 * The server stores NAMES, not glyphs: `record_reaction` allowlists
 * `heart | laugh | cry | fire` and answers anything else with `invalid_emoji`.
 * Probed live before this module existed — the first attempt sent "❤️" and got
 * `invalid_emoji` four times in a row. Storing a glyph would also drift the
 * moment a platform re-renders it, so the mapping lives here and the column
 * stays stable.
 *
 * Repeat taps are DELIBERATE. The handoff floats an emoji upward on every
 * press, so the RPC inserts a row each time; the only limit is the server's
 * 60-per-visitor-per-hour budget.
 */
import { supabase } from "./supabase";

export interface Reaction {
  /** What the server stores. */
  key: ReactionKey;
  /** What the recipient taps. */
  glyph: string;
  /** Icon-only control, so it needs its own label. */
  label: string;
}

export type ReactionKey = "heart" | "laugh" | "cry" | "fire";

export const REACTIONS: readonly Reaction[] = [
  { key: "heart", glyph: "❤️", label: "Love it" },
  { key: "laugh", glyph: "😂", label: "That's funny" },
  { key: "cry", glyph: "😢", label: "That got me" },
  { key: "fire", glyph: "🔥", label: "Amazing" },
] as const;

const KEYS: readonly string[] = REACTIONS.map((r) => r.key);

export function isReactionKey(value: string): value is ReactionKey {
  return KEYS.includes(value);
}

export type ReactionCounts = Record<ReactionKey, number>;

export const EMPTY_COUNTS: ReactionCounts = { heart: 0, laugh: 0, cry: 0, fire: 0 };

/**
 * `get_reaction_counts` returns one row per emoji that has any. Zero-fill the
 * rest so the bar renders four slots whatever the data does, and drop any
 * value outside the allowlist rather than growing a fifth column for it.
 */
export function countsFromRows(
  rows: readonly { emoji: string; count: number }[] | null | undefined
): ReactionCounts {
  const out: ReactionCounts = { ...EMPTY_COUNTS };
  for (const row of rows ?? []) {
    if (!isReactionKey(row.emoji)) continue;
    // PostgREST serialises bigint as a string.
    out[row.emoji] = Number(row.count) || 0;
  }
  return out;
}

/** Immutable bump, so the float animation can start before the round trip. */
export function applyOptimistic(counts: ReactionCounts, key: ReactionKey): ReactionCounts {
  return { ...counts, [key]: counts[key] + 1 };
}

/**
 * Zero renders as nothing — a row of "0"s makes an untouched reveal look
 * ignored rather than new.
 */
export function formatReactionCount(n: number): string {
  if (n <= 0) return "";
  if (n < 1000) return String(n);
  const k = n / 1000;
  // 1.5k, but 12k not 12.0k.
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: T | null; error: unknown }>;
  const { data } = await call(name, args);
  return data ?? null;
}

export async function getReactionCounts(slug: string): Promise<ReactionCounts> {
  const rows = await rpc<{ emoji: string; count: number }[]>("get_reaction_counts", {
    p_slug: slug,
  });
  return countsFromRows(rows);
}

/**
 * Fire-and-forget by design: the float has already played and the count has
 * already moved. A failure here costs a number, not the moment.
 *
 * `pin` is forwarded because a PIN-locked surprise should not accept input
 * from someone who never passed the gate.
 */
export async function sendReaction(input: {
  slug: string;
  key: ReactionKey;
  visitorHash: string;
  pin?: string | null;
}): Promise<boolean> {
  const res = await rpc<{ ok?: boolean }>("record_reaction", {
    p_slug: input.slug,
    p_emoji: input.key,
    p_visitor_hash: input.visitorHash,
    p_pin: input.pin ?? null,
  });
  return res?.ok === true;
}
