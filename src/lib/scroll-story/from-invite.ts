/**
 * from-invite.ts — maps a real invite row into a Scroll Story `StoryConfig`.
 *
 * Pure and side-effect free so it runs identically on server and client.
 * Phase 1 rendered exclusively from `demoConfig`; this is the Phase-2 bridge
 * that lets the surprise page drive `ScrollStoryReveal` from live invite data.
 */

import type { StoryConfig, StoryEvent, StoryPhoto } from "./config";

/** The invite photo shape the surprise page already produces (signed URLs). */
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
   * Raw `invites.events` jsonb column. Untyped on purpose — the DB stores
   * whatever the create flow wrote, so the adapter defends against null,
   * non-arrays, and malformed entries at read time.
   */
  events?: unknown;
}

/** Context the surprise page threads in from outside the invite row. */
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
 * Coerce the raw `invites.events` jsonb value into a clean `StoryEvent[]`.
 * Tolerant by design: a null/undefined column, a non-array value, or malformed
 * entries all degrade to fewer (or zero) events rather than throwing on the
 * hot render path. An entry needs a non-empty `label` and `title` to survive;
 * `detail` and `mapsQuery` are copied through only when they are strings.
 */
function toStoryEvents(raw: unknown): StoryEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: StoryEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const { label, title, detail, mapsQuery } = entry;
    if (typeof label !== "string" || label.trim() === "") continue;
    if (typeof title !== "string" || title.trim() === "") continue;
    const event: StoryEvent = { label, title };
    if (typeof detail === "string") event.detail = detail;
    if (typeof mapsQuery === "string") event.mapsQuery = mapsQuery;
    events.push(event);
  }
  return events;
}

/**
 * Build a `StoryConfig` from an invite row + page-supplied context.
 * The timeline (`events`) is read from the invite's `events` jsonb column via
 * a tolerant coercion; when it is empty the plan scene falls back to a single
 * countdown plaque (handled downstream in `PlanScene`).
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
