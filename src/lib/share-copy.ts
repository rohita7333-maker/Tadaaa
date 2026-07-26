// Ported 1:1 from web src/lib/share-copy.ts — share message variants.
export type ShareCopyVariant = "control" | "personal" | "intrigue";

export interface ShareCopyOpts {
  title: string;
  url: string;
  creatorName?: string;
}

export function getShareCopy(
  variant: ShareCopyVariant | string | undefined,
  opts: ShareCopyOpts
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
