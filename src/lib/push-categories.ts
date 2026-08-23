/**
 * Frame F1 — push notification categories, their long-press actions, and where
 * a tapped notification lands.
 *
 * Pure data and pure functions: no `expo-notifications` import, so the routing
 * and the moderation mapping are testable without a native module. The
 * registration side-effects live in `push-notifications.ts`.
 *
 * ── What of F1 this covers, and what it cannot ────────────────────────────
 * F1 draws three separate native surfaces. Two of them — the ActivityKit Live
 * Activity and the medium home-screen widget — need a development build with
 * a Widget Extension target and cannot run in Expo Go at all. This file is the
 * third: the notification categories, the Approve/Reject actions the frame
 * describes ("Hold to approve without opening the app"), and the deep links.
 *
 * ── What still has no sender ──────────────────────────────────────────────
 * `SCHEDULED_LIVE` fires from THIS DEVICE — see `scheduledLiveReminders`, which
 * schedules a local notification at each of the creator's own countdown dates.
 * The other four are remote-only and nothing emits them yet: there is no push
 * sender on the backend (web notifies by email through its cron routes). The
 * receiving half is complete and correct; the emitting half is a backend
 * feature that does not exist. That is stated in the delivery report, not
 * hidden behind a category list that looks finished.
 */

export type PushCategoryId =
  | "VIEW_OPENED"
  | "NEW_CONTRIBUTION"
  | "RSVP"
  | "OCCASION_REMINDER"
  | "SCHEDULED_LIVE";

export interface PushAction {
  readonly identifier: string;
  readonly buttonTitle: string;
  readonly options: {
    readonly opensAppToForeground: boolean;
    readonly isDestructive?: boolean;
  };
}

export interface PushCategory {
  readonly identifier: PushCategoryId;
  readonly actions: readonly PushAction[];
}

/**
 * Action identifier -> the `moderation_status` it writes.
 *
 * Exported so the identifiers and the mapping cannot drift into two lists.
 */
export const MODERATION_ACTIONS = {
  APPROVE_CONTRIBUTION: "approved",
  REJECT_CONTRIBUTION: "rejected",
} as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[keyof typeof MODERATION_ACTIONS];

/**
 * The frame's five categories, in the frame's order.
 *
 * Only NEW_CONTRIBUTION carries actions. Neither of them foregrounds the app:
 * the whole value of the pair is clearing the moderation queue from the Lock
 * Screen. `isDestructive` on Reject is iOS's red tint, not a different code
 * path — both resolve in the background.
 */
export const PUSH_CATEGORIES: readonly PushCategory[] = [
  { identifier: "VIEW_OPENED", actions: [] },
  {
    identifier: "NEW_CONTRIBUTION",
    actions: [
      {
        identifier: "APPROVE_CONTRIBUTION",
        buttonTitle: "Approve",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "REJECT_CONTRIBUTION",
        buttonTitle: "Reject",
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ],
  },
  { identifier: "RSVP", actions: [] },
  { identifier: "OCCASION_REMINDER", actions: [] },
  { identifier: "SCHEDULED_LIVE", actions: [] },
];

/** Null for the plain body tap and for anything this build does not know. */
export function contributionActionStatus(actionIdentifier: string): ModerationAction | null {
  return (
    (MODERATION_ACTIONS as Record<string, ModerationAction | undefined>)[actionIdentifier] ?? null
  );
}

/**
 * A notification payload arrives from the push service, not from this app, so
 * `inviteId` is untrusted input on its way into a router path. Anything that is
 * not a plain id token is refused rather than escaped — there is no legitimate
 * id containing a slash, a query or a fragment.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Where each category's notification should land when the body is tapped. */
export function notificationRoute(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const category = (data as { category?: unknown }).category;
  const inviteId = (data as { inviteId?: unknown }).inviteId;

  // The wizard, not a surprise — an occasion reminder is a prompt to make one.
  if (category === "OCCASION_REMINDER") return "/create";

  const known: readonly unknown[] = ["VIEW_OPENED", "NEW_CONTRIBUTION", "RSVP", "SCHEDULED_LIVE"];
  if (!known.includes(category)) return null;

  if (typeof inviteId !== "string" || !ID_PATTERN.test(inviteId)) return null;

  // A contribution is reviewed in the moderation queue, which is B4 — not the
  // surprise's own detail screen, which has no Approve/Reject.
  if (category === "NEW_CONTRIBUTION") return "/activity";
  return `/invite/${inviteId}`;
}

/* -------------------------------------------------- local SCHEDULED_LIVE */

/**
 * Anything due sooner than this is not worth a scheduled notification — the
 * OS may not deliver it before the moment passes, and a "it's live" alert that
 * arrives after the recipient has already opened it is noise.
 */
export const SCHEDULED_LIVE_LEAD_MS = 5 * 60 * 1000;

export interface ScheduledLiveSource {
  readonly id: string;
  readonly title: string | null;
  readonly countdown_date: string | null;
}

export interface ScheduledLiveReminder {
  readonly inviteId: string;
  readonly title: string;
  readonly fireAt: Date;
}

/**
 * The creator's own upcoming surprises, as local notifications.
 *
 * This is the one F1 category with a real trigger today: the device already
 * knows when each scheduled surprise opens, so it does not need a server to
 * tell it. Soonest first, so a caller that caps the schedule keeps the ones
 * that matter.
 */
export function scheduledLiveReminders(
  invites: readonly ScheduledLiveSource[],
  now: Date = new Date()
): ScheduledLiveReminder[] {
  const floor = now.getTime() + SCHEDULED_LIVE_LEAD_MS;

  return invites
    .map((invite) => {
      if (!invite.countdown_date) return null;
      const ms = Date.parse(invite.countdown_date);
      if (Number.isNaN(ms) || ms < floor) return null;
      return {
        inviteId: invite.id,
        title: invite.title?.trim() || "Your surprise",
        fireAt: new Date(ms),
      };
    })
    .filter((r): r is ScheduledLiveReminder => r !== null)
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
