/**
 * Derived invite status — the one rule both platforms share.
 *
 * MIRROR (1:1): the web repo ships the identical rule at
 * `surprise-invite/src/lib/invite-status.ts`. These two files are a matched
 * pair: the precedence order, the status union, and the labels must stay
 * byte-equivalent in meaning. Change one without the other and the platforms
 * silently disagree about what "Live" means.
 *
 * Why derived and not read: a migration adding an `invites.status` column is
 * approved but NOT applied. Nothing here may read `invite.status` — the column
 * does not exist yet, and a read would return undefined in production.
 *
 * Precedence, first match wins:
 *   1. `deleted_at` set           -> archived   (soft-deleted beats everything)
 *   2. `expires_at` in the past   -> expired
 *   3. `is_active` not exactly true -> archived (null and false both count)
 *   4. `countdown_date` in future -> scheduled
 *   5. otherwise                  -> live
 */

export type InviteStatus = "live" | "scheduled" | "expired" | "archived";

/**
 * The only four columns the rule reads. Structural rather than `Invite` so
 * both real rows and test fixtures satisfy it without a cast.
 */
export interface InviteStatusInput {
  deleted_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean | null;
  countdown_date?: string | null;
}

/** `true` only for a parseable timestamp strictly before `now`. */
function isBefore(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && at < now;
}

/** `true` only for a parseable timestamp strictly after `now`. */
function isAfter(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && at > now;
}

/**
 * Derive the display status of an invite.
 *
 * `now` is injectable so the rule is testable without freezing the clock; call
 * sites pass nothing.
 */
export function deriveInviteStatus(
  invite: InviteStatusInput,
  now: number = Date.now()
): InviteStatus {
  if (invite.deleted_at) return "archived";
  if (isBefore(invite.expires_at, now)) return "expired";
  if (invite.is_active !== true) return "archived";
  if (isAfter(invite.countdown_date, now)) return "scheduled";
  return "live";
}

/** Row-badge copy. Sentence case, matching the mockup's `.stat-pill`. */
export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
  expired: "Expired",
  archived: "Archived",
};
