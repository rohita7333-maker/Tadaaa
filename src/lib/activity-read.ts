/**
 * B4 — read state, Today/Earlier grouping, and the moderation card's
 * attribution line.
 *
 * READ STATE IS LOCAL, AND THAT IS A DECISION.
 *
 * Nothing in the schema records whether a creator has seen a notification —
 * there is no `read_at`, no `notifications` table, and adding one would mean a
 * write on every scroll. So "Mark all read" stores a single timestamp on the
 * device and anything newer than it is unread. The cost is honest and small:
 * read state does not follow you to a second phone. The alternative — a column
 * that exists only so a dot can go grey — is a lot of schema for a dot.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tadaaaa.activityReadAt";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/**
 * Strictly greater, never `>=`: an event stamped at exactly the mark must count
 * as read, or the newest row stays coral after "Mark all read" and the button
 * looks broken.
 */
export function isUnread(at: string, lastReadAt: number | null): boolean {
  const t = new Date(at).getTime();
  // An unparseable timestamp reads as read. The opposite leaves a row coral
  // forever with no way to clear it.
  if (!Number.isFinite(t)) return false;
  if (lastReadAt === null) return true;
  return t > lastReadAt;
}

export async function readLastReadAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function markAllRead(now: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(now));
  } catch {
    // A dot that stays coral is a cosmetic loss; a throw here is not.
  }
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface DatedItem {
  at: string;
}

export interface RecencyGroup<T extends DatedItem> {
  title: "Today" | "Earlier";
  items: T[];
}

/** Frame B4's two headers. An empty group is omitted, never left headed. */
export function groupByRecency<T extends DatedItem>(
  items: readonly T[],
  now: number = Date.now()
): RecencyGroup<T>[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const today = sorted.filter((i) => now - new Date(i.at).getTime() < DAY_MS);
  const earlier = sorted.filter((i) => now - new Date(i.at).getTime() >= DAY_MS);

  const out: RecencyGroup<T>[] = [];
  if (today.length) out.push({ title: "Today", items: today });
  if (earlier.length) out.push({ title: "Earlier", items: earlier });
  return out;
}

// ---------------------------------------------------------------------------
// Moderation card
// ---------------------------------------------------------------------------

/** Coarse on purpose — a live-ticking "11 min ago" is noise, not information. */
export function relativeAge(at: string, now: number = Date.now()): string {
  const diff = now - new Date(at).getTime();
  if (!Number.isFinite(diff)) return "";
  if (diff < MINUTE_MS) return "just now";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} min ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`;
  return `${Math.floor(diff / DAY_MS)}d ago`;
}

/** "Aanya · 2 photos attached · 11 min ago" — frame B4 verbatim. */
export function moderationLine(
  input: { name: string; photoCount: number; createdAt: string },
  now: number = Date.now()
): string {
  const name = input.name.trim() === "" ? "Someone" : input.name.trim();
  const parts = [name];
  if (input.photoCount > 0) {
    parts.push(`${input.photoCount} photo${input.photoCount === 1 ? "" : "s"} attached`);
  }
  parts.push(relativeAge(input.createdAt, now));
  return parts.join(" · ");
}
