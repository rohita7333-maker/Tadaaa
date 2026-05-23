/**
 * Share copy A/B variants for PostHog feature flag "share_copy_v1".
 *
 * Pure functions — no side effects, easy to test.
 */

export type ShareCopyVariant = "control" | "personal" | "intrigue";

export interface ShareCopyOpts {
  title: string;
  url: string;
  creatorName?: string;
}

/**
 * Returns the formatted WhatsApp / native-share message for the given variant.
 *
 * - "control"  — anonymous, branded opener
 * - "personal" — names the creator
 * - "intrigue" — mystery, omits title
 *
 * Falls back to "control" for any unknown / undefined variant.
 * Raw strings only — callers are responsible for URL-encoding when needed.
 */
export function getShareCopy(
  variant: ShareCopyVariant | string | undefined,
  opts: ShareCopyOpts,
): string {
  const { title, url, creatorName } = opts;
  const creator = creatorName?.trim() || undefined;

  switch (variant) {
    case "personal":
      return `${creator ?? "Someone"} made something special for you 💌 ${title} ${url}`;
    case "intrigue":
      return `You've got a surprise from ${creator ?? "someone"} 🎁 ${url}`;
    case "control":
    default:
      return `💌 ${title} — Someone made something special for you! ${url}`;
  }
}
