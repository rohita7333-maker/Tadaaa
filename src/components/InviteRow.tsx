/**
 * Invite row — the RN equivalent of the mockup's `.srow`
 * (`tadaaaa/tadaaaa-editorial.html` L262-270, and the web's `.ed-srow`):
 * 60px thumb, 17px headline title, a 12px stone meta line carrying the status
 * pill, and a bottom hairline that the last row drops.
 *
 * Status is derived, never read: see `@/lib/invite-status`. The `invites.status`
 * column is approved but unapplied, so reading it would return undefined.
 */
import { EdListRow, EdMeta, EdStatusPill, EdThumb, palette } from "@/components/editorial";
import { getOccasionById, getThemeById, gradientStops } from "@/lib/themes";
import { deriveInviteStatus, INVITE_STATUS_LABELS } from "@/lib/invite-status";
import type { Invite } from "@/lib/db";

/** Tones the legacy `Chip` accepts, kept for `invite/[id].tsx`. */
type ChipTone = "green" | "gold" | "rose" | "neutral";

const STATUS_CHIP_TONE: Record<string, ChipTone> = {
  live: "gold",
  scheduled: "neutral",
  expired: "rose",
  archived: "neutral",
};

/**
 * Back-compat shim for `invite/[id].tsx`, which is owned by another phase and
 * still renders the legacy `Chip`. Same single rule underneath — this only
 * re-shapes the result, it does not re-derive it.
 */
export function inviteStatus(invite: Invite): { label: string; tone: ChipTone } {
  const status = deriveInviteStatus(invite);
  return { label: INVITE_STATUS_LABELS[status], tone: STATUS_CHIP_TONE[status] };
}

export function InviteRow({
  invite,
  onPress,
  last,
  rsvpCount,
}: {
  invite: Invite;
  onPress: () => void;
  last?: boolean;
  /**
   * Aggregated from `invite_rsvps` by `@/lib/rsvp-counts`, because
   * `invites.response_count` counts ANSWERS, not RSVPs. Web keeps the two
   * numbers apart (`components/dashboard/InviteCard.tsx:144,147`) and so do we.
   */
  rsvpCount?: number;
}) {
  const theme = getThemeById(invite.theme);
  const occasion = getOccasionById(invite.occasion_type);
  const status = deriveInviteStatus(invite);
  // A flat wash of the theme's leading stop, not the ramp: the editorial
  // identity bans decorative gradients, and one colour still reads the theme.
  const tint = theme ? gradientStops(theme)[0] : palette.pebble;
  const views = invite.view_count ?? 0;
  const answers = invite.response_count ?? 0;
  const rsvps = rsvpCount ?? 0;

  return (
    <EdListRow
      last={last}
      onPress={onPress}
      title={invite.title}
      accessibilityLabel={`${invite.title}. ${INVITE_STATUS_LABELS[status]}. ${views} views, ${rsvps} RSVPs, ${answers} answers.`}
      thumb={<EdThumb tint={tint} glyph={occasion?.emoji ?? "💌"} />}
      meta={
        <>
          <EdStatusPill status={status} />
          <EdMeta>{views} views</EdMeta>
          <EdMeta>{rsvps} RSVPs</EdMeta>
          <EdMeta>{answers} answers</EdMeta>
        </>
      }
    />
  );
}
