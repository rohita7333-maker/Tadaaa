/**
 * from-invite.ts — maps a real invite row into a Scroll Story `StoryConfig`.
 *
 * Mirrors web `surprise-invite/src/lib/scroll-story/from-invite.ts` mapping
 * exactly, adapted to the mobile invite/photo shapes (`InviteForStory` here
 * takes `photos: { url, caption, rotation_deg }[]`, matching the signed-URL
 * photo objects the surprise screen already builds from `RevealData`).
 *
 * Pure and side-effect free.
 */
import type { StoryConfig, StoryEvent, StoryPhoto } from "./config";

/** The invite photo shape the surprise screen already produces (signed URLs). */
export interface InviteStoryPhoto {
  url: string;
  caption?: string;
  rotation_deg?: number;
}

/** The subset of an invite row the adapter reads. */
export interface InviteForStory {
  slug: string;
  title: string;
  message: string;
  countdown_date: string | null;
  is_paid?: boolean;
  photos: InviteStoryPhoto[];
  /**
   * `invites.events` jsonb from the live DB — an array of
   * `{ label, title, detail?, mapsQuery? }`. Typed `unknown` because the value
   * is untrusted jsonb (may be null, a non-array, or contain malformed items);
   * `toStoryEvents` validates it defensively.
   */
  events?: unknown;
}

/** Context the surprise screen threads in from outside the invite row. */
export interface InviteToStoryOptions {
  /** Creator's display name → shown as the story's sender. */
  senderName?: string;
  /** Human title-case occasion label (e.g. "Birthday Wish"). */
  occasionLabel?: string;
}

const EYEBROW = "a surprise for";

function toStoryPhoto(photo: InviteStoryPhoto): StoryPhoto {
  return {
    src: photo.url,
    caption: photo.caption,
    rotationDeg: photo.rotation_deg,
  };
}

/**
 * Coerce the untrusted `invites.events` jsonb into `StoryEvent[]`.
 * Tolerant by contract: a non-array (null, object, string) yields `[]`, and any
 * item missing a non-empty string `label` and `title` is filtered out. Optional
 * `detail` / `mapsQuery` are carried through only when they are strings.
 */
function toStoryEvents(raw: unknown): StoryEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: StoryEvent[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { label, title, detail, mapsQuery } = item as Record<string, unknown>;
    if (typeof label !== "string" || label.length === 0) continue;
    if (typeof title !== "string" || title.length === 0) continue;
    events.push({
      label,
      title,
      detail: typeof detail === "string" ? detail : undefined,
      mapsQuery: typeof mapsQuery === "string" ? mapsQuery : undefined,
    });
  }
  return events;
}

/**
 * Build a `StoryConfig` from an invite row + page-supplied context.
 * The timeline (`events`) is mapped from the invite's `events` jsonb when
 * present; malformed or absent data falls back to `[]`, letting PlanScene derive
 * a single "When" plaque from the countdown instead.
 */
export function inviteToStoryConfig(
  invite: InviteForStory,
  opts: InviteToStoryOptions
): StoryConfig {
  return {
    slug: invite.slug,
    recipient: invite.title,
    eyebrow: EYEBROW,
    occasionLine: opts.occasionLabel ?? "",
    sender: opts.senderName,
    message: invite.message,
    events: toStoryEvents(invite.events),
    photos: invite.photos.map(toStoryPhoto),
    countdownTo: invite.countdown_date ?? undefined,
    tier: invite.is_paid ? "paid" : "free",
  };
}
