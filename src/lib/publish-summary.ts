/**
 * C6's content line and summary table.
 *
 * The frame prints "3 photos · 4 messages · music on · PIN 30··" and a four-row
 * table (Reveal / Delivery / Contributors / Link lasts). These are the last
 * things anyone reads before publishing, so they live here with tests rather
 * than being assembled inline.
 */
import { toRevealType } from "./schema-adapter";
import type { RevealStyle } from "./schema-adapter";
import { revealStyleLabel } from "./surprise-detail";
import type { ScheduleMode } from "./wizard";
import type { Tier } from "./tier";

const FREE_LINK_DAYS = 7;
const PAID_LINK_DAYS = 30;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * "PIN 30··" — enough for the creator to recognise which PIN they set, never
 * enough for a shoulder to read it off the screen. A PIN that is not the full
 * four digits renders as nothing at all: a partial PIN in a summary is a hint
 * for someone else, not a reminder for you.
 */
export function maskPin(pin: string | null | undefined): string | null {
  if (!pin || !/^[0-9]{4}$/.test(pin)) return null;
  return `PIN ${pin.slice(0, 2)}··`;
}

export function contentLine(input: {
  photos: number;
  approvedContributions: number;
  musicEnabled: boolean;
  pin: string | null;
}): string {
  const parts: string[] = [];
  if (input.photos > 0) parts.push(plural(input.photos, "photo", "photos"));
  if (input.approvedContributions > 0) {
    parts.push(plural(input.approvedContributions, "message", "messages"));
  }
  if (input.musicEnabled) parts.push("music on");
  const pin = maskPin(input.pin);
  if (pin) parts.push(pin);
  // An empty line reads as a rendering failure; say what it actually is.
  if (parts.length === 0) return "Just your words";
  return parts.join(" · ");
}

export interface SummaryRow {
  key: string;
  value: string;
}

export function summaryRows(input: {
  revealStyle: RevealStyle;
  scheduleMode: ScheduleMode;
  scheduledAt: string | null;
  timezone: string | null;
  approvedContributions: number;
  contributionsOpen: boolean;
  tier: Tier;
}): SummaryRow[] {
  const delivery =
    input.scheduleMode === "now" || !input.scheduledAt
      ? "Right away"
      : `${new Date(input.scheduledAt).toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })} ${input.timezone ? input.timezone : "their time"}`;

  return [
    { key: "Reveal", value: revealStyleLabel(toRevealType(input.revealStyle)) },
    { key: "Delivery", value: delivery },
    {
      key: "Contributors",
      value: input.contributionsOpen
        ? `${input.approvedContributions} approved`
        : "Not open",
    },
    {
      key: "Link lasts",
      value:
        input.tier === "free" ? `${FREE_LINK_DAYS} days (free)` : `${PAID_LINK_DAYS} days`,
    },
  ];
}

/** Days the published link stays alive, by tier. Used to set `expires_at`. */
export function linkLifeDays(tier: Tier): number {
  return tier === "free" ? FREE_LINK_DAYS : PAID_LINK_DAYS;
}
