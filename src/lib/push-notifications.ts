/**
 * Expo push registration and frame F1's notification categories.
 *
 * ── Corrected 2026-08-17 ──────────────────────────────────────────────────
 * The header here used to say the `push_tokens` migration was "NOT YET
 * APPLIED". The TABLE has existed for some time; what did not exist was the
 * `claim_push_token` FUNCTION this file calls. Every registration therefore
 * warned and swallowed, and mobile push token registration has been dead the
 * entire time while reading as "works, pending a migration". The function is
 * applied now (`claim_push_token` migration) and verified live.
 *
 * Still required before a real push can arrive: an EAS project id
 * (`extra.eas.projectId` in app.json, written by `eas init`). Until that is
 * configured `getExpoPushToken` returns null and everything below no-ops.
 *
 * NOTHING SENDS the four remote categories yet — there is no push sender on
 * the backend; web notifies by email through its cron routes. `SCHEDULED_LIVE`
 * is the exception: `syncScheduledLiveReminders` schedules it locally from the
 * creator's own countdown dates, so that one genuinely fires.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import {
  PUSH_CATEGORIES,
  scheduledLiveReminders,
  type ScheduledLiveSource,
} from "./push-categories";

export type PushPlatform = "ios" | "android";

function getEasProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ?? null;
}

/**
 * Requests permission and fetches this device's Expo push token. Returns
 * null (never throws) when unsupported (web), permission is denied, or no
 * EAS project id is configured yet — every caller treats "no token" as a
 * normal, silent no-op.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return null;

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn("[push] no EAS projectId configured — skipping token registration");
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.warn("[push] failed to fetch Expo push token:", e);
    return null;
  }
}

/**
 * Claims this device's token for the signed-in user via the claim_push_token
 * RPC (sql/push_tokens.sql).
 *
 * A direct upsert on the UNIQUE expo_token cannot work here: when a second
 * account signs in on the same device the conflict resolves to an UPDATE of
 * the previous owner's row, which the owner-only RLS policy rejects — the
 * new user then silently never gets notifications. The SECURITY DEFINER RPC
 * re-points the token instead, deriving ownership from auth.uid().
 *
 * The `as unknown as never` cast is gone: `claim_push_token` now exists and is
 * in `database.types.ts`, so the call is type-checked against the real schema.
 *
 * Still fails soft. A device that cannot register must not break sign-in.
 */
export async function upsertPushToken(
  expoToken: string,
  platform: PushPlatform
): Promise<void> {
  const { data, error } = await supabase.rpc("claim_push_token", {
    p_token: expoToken,
    p_platform: platform,
  });
  if (error) {
    console.warn("[push] token claim failed:", error.message);
    return;
  }
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.ok !== true) {
    console.warn("[push] token claim refused:", result?.error ?? "unknown");
  }
}

/** One-shot: register + persist. Never throws — safe to fire-and-forget. */
export async function registerAndSavePushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  const platform: PushPlatform = Platform.OS === "ios" ? "ios" : "android";
  await upsertPushToken(token, platform);
}

/* ------------------------------------------------------- F1: categories */

/**
 * Registers frame F1's five categories so a delivered notification carries its
 * long-press actions. Idempotent — the OS keeps one definition per identifier,
 * so calling this on every launch simply refreshes it.
 *
 * Never throws: on web there is no notification centre, and a category that
 * fails to register costs the actions, not the app.
 */
export async function registerNotificationCategories(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Promise.all(
      PUSH_CATEGORIES.map((category) =>
        Notifications.setNotificationCategoryAsync(
          category.identifier,
          category.actions.map((action) => ({
            identifier: action.identifier,
            buttonTitle: action.buttonTitle,
            options: {
              opensAppToForeground: action.options.opensAppToForeground,
              isDestructive: action.options.isDestructive ?? false,
            },
          }))
        )
      )
    );
  } catch (e) {
    console.warn("[push] category registration failed:", e);
  }
}

/** Identifier prefix so this scheduler only ever cancels its own work. */
const SCHEDULED_LIVE_PREFIX = "scheduled-live:";
/**
 * iOS caps an app at 64 pending local notifications. Staying well under it
 * leaves room for anything else the app schedules later; the list is soonest
 * first, so a creator with more upcoming surprises than this keeps the
 * nearest ones.
 */
const MAX_SCHEDULED = 20;

/**
 * Reconciles the device's pending SCHEDULED_LIVE reminders against the
 * creator's own surprises.
 *
 * Cancel-then-schedule rather than diffing: a countdown date can move, a
 * surprise can be deleted, and a stale "it's live" alert for something that no
 * longer exists is worse than a redundant re-schedule. Only identifiers this
 * function created are cancelled.
 */
export async function syncScheduledLiveReminders(
  invites: readonly ScheduledLiveSource[]
): Promise<number> {
  if (Platform.OS === "web") return 0;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return 0;

    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => n.identifier.startsWith(SCHEDULED_LIVE_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const due = scheduledLiveReminders(invites).slice(0, MAX_SCHEDULED);
    for (const reminder of due) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${SCHEDULED_LIVE_PREFIX}${reminder.inviteId}`,
        content: {
          title: `${reminder.title} is live`,
          body: "The link works now. Send it.",
          categoryIdentifier: "SCHEDULED_LIVE",
          data: { category: "SCHEDULED_LIVE", inviteId: reminder.inviteId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
        },
      });
    }
    return due.length;
  } catch (e) {
    console.warn("[push] scheduled-live sync failed:", e);
    return 0;
  }
}
