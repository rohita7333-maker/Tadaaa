/**
 * Keepsake export — frame B2's `···` → "Export keepsake".
 *
 * Plain text, handed to the native share sheet. The handoff asks for "the same
 * JSON payload as exportData()" for B6's account export; a keepsake is a
 * different thing — it is the surprise as something a person would want to keep
 * and re-read, so it reads as prose rather than as a data dump. B6's export
 * stays JSON.
 */
import { occasionLabel } from "./occasions";
import { revealStyleLabel } from "./surprise-detail";

export interface KeepsakeInput {
  invite: {
    title: string;
    message?: string | null;
    occasion_type?: string | null;
    reveal_type?: string | null;
    created_at?: string | null;
  };
  contributions: readonly { name: string; message: string }[];
  rsvpCount: number;
  reactionCount: number;
  url: string;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildKeepsake(input: KeepsakeInput): string {
  const { invite } = input;
  const parts: string[] = [invite.title];

  const kind = [occasionLabel(invite.occasion_type), revealStyleLabel(invite.reveal_type)]
    .filter(Boolean)
    .join(" · ");
  if (kind) parts.push(kind);

  if (invite.message && invite.message.trim() !== "") {
    parts.push("", invite.message.trim());
  }

  if (input.contributions.length > 0) {
    parts.push("", "Messages");
    for (const c of input.contributions) {
      const name = c.name.trim() === "" ? "Someone" : c.name.trim();
      parts.push(`— ${name}: ${c.message}`);
    }
  }

  parts.push(
    "",
    `${plural(input.rsvpCount, "RSVP", "RSVPs")} · ${plural(
      input.reactionCount,
      "reaction",
      "reactions"
    )}`,
    input.url
  );

  return parts.join("\n");
}
