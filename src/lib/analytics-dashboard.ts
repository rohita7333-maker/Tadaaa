import { sanitizeGuestName } from "@/lib/activity-feed";

/**
 * Pure aggregation for the per-invite analytics dashboard.
 *
 * Every metric here is derived from a row that actually exists. Notably absent
 * — because the data to back them honestly does not exist:
 *   • unique visitors — `invite_views` stores no visitor identity (only a
 *     user-agent string), by privacy design.
 *   • reveal-completion % — no per-visitor completion event is recorded.
 *   • viewer geography — IPs are hashed at the boundary and never stored raw.
 * Adding any of those means new tracking, not new maths. Until then this file
 * reports what is true.
 */

export const ANALYTICS_FEED_CAP = 12;
export const VIEW_SERIES_DAYS = 7;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface ViewBucket {
  isoDate: string;
  label: string;
  count: number;
}

export interface FunnelStage {
  key: "opened" | "responded" | "reacted";
  label: string;
  count: number;
  pct: number;
}

export interface EmojiRow {
  emoji: string;
  count: number;
  pct: number;
}

export interface ResponseFeedItem {
  name: string;
  detail: string;
  at: string;
}

/** UTC calendar day (YYYY-MM-DD) — bucketing must not drift with server TZ. */
function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Seven day-buckets ending on `now`, oldest first. Views outside the window or
 * with unparseable timestamps are dropped rather than throwing — a malformed
 * row must never take the whole dashboard down.
 */
export function buildViewSeries(
  views: { viewed_at: string | null }[],
  now: Date
): ViewBucket[] {
  const buckets = new Map<string, ViewBucket>();

  for (let i = VIEW_SERIES_DAYS - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - i);
    const key = utcDayKey(day);
    buckets.set(key, { isoDate: key, label: WEEKDAYS[day.getUTCDay()], count: 0 });
  }

  for (const view of views) {
    if (!view.viewed_at) continue;
    const at = new Date(view.viewed_at);
    if (Number.isNaN(at.getTime())) continue;
    const bucket = buckets.get(utcDayKey(at));
    if (bucket) bucket.count += 1;
  }

  return [...buckets.values()];
}

/**
 * Opens → responses → reactions, each as a share of opens.
 *
 * Percentages are clamped to 100: reactions are not deduplicated per visitor,
 * so a single enthusiastic recipient can legitimately out-count the opens.
 */
export function buildFunnel({
  views,
  responders,
  reactions,
}: {
  views: number;
  responders: number;
  reactions: number;
}): FunnelStage[] {
  const pct = (n: number) =>
    views <= 0 ? 0 : Math.min(100, Math.round((n / views) * 100));

  return [
    { key: "opened", label: "Opened", count: views, pct: views > 0 ? 100 : 0 },
    { key: "responded", label: "Responded", count: responders, pct: pct(responders) },
    { key: "reacted", label: "Reacted", count: reactions, pct: pct(reactions) },
  ];
}

/**
 * `invite_reactions.emoji` stores short keys ("heart"), not glyphs — the web
 * app has no reaction picker of its own, so this is the only place that
 * translates them. Unknown keys pass through as their own label rather than
 * being guessed at or dropped.
 */
const REACTION_GLYPHS: Record<string, string> = {
  heart: "❤️",
  laugh: "😂",
  fire: "🔥",
  wow: "😮",
  cry: "🥹",
  clap: "👏",
};

export function describeReaction(raw: string): { glyph: string | null; label: string } {
  const key = raw.trim().toLowerCase();
  const glyph = REACTION_GLYPHS[key];
  if (glyph) return { glyph, label: key[0].toUpperCase() + key.slice(1) };
  // Anything non-alphanumeric is already a glyph (a raw emoji reaction).
  if (!/^[a-z0-9_-]+$/.test(key)) return { glyph: raw.trim(), label: raw.trim() };
  return { glyph: null, label: raw.trim() };
}

/** Reaction mix, most-used first. Shares are of total reactions, not of views. */
export function buildEmojiBreakdown(reactions: { emoji: string | null }[]): EmojiRow[] {
  const counts = new Map<string, number>();

  for (const reaction of reactions) {
    const emoji = (reaction.emoji ?? "").trim();
    if (!emoji) continue;
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([emoji, count]) => ({
      emoji,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

/**
 * RSVPs and contributions on one newest-first timeline. Guest names are the
 * only recipient-supplied strings rendered, so they go through the same
 * sanitizer + length cap the activity feed uses.
 */
export function buildResponseFeed({
  rsvps,
  contributions,
}: {
  rsvps: { name: string | null; responded_at: string | null }[];
  contributions: {
    contributor_name: string | null;
    message: string | null;
    photo_url: string | null;
    created_at: string | null;
  }[];
}): ResponseFeedItem[] {
  const items: ResponseFeedItem[] = [];

  for (const rsvp of rsvps) {
    if (!rsvp.responded_at) continue;
    items.push({
      name: sanitizeGuestName(rsvp.name) ?? "Guest",
      detail: "RSVP — yes",
      at: rsvp.responded_at,
    });
  }

  for (const contribution of contributions) {
    if (!contribution.created_at) continue;
    const hasMessage = !!contribution.message?.trim();
    const hasPhoto = !!contribution.photo_url;
    if (!hasMessage && !hasPhoto) continue;
    items.push({
      name: sanitizeGuestName(contribution.contributor_name) ?? "Guest",
      detail: hasMessage && hasPhoto ? "Message + photo" : hasMessage ? "Message" : "Photo",
      at: contribution.created_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, ANALYTICS_FEED_CAP);
}
