/**
 * Expo push notification registration — notify-on-RSVP / notify-on-view.
 *
 * Ledger: sql/push_tokens.sql (Phase W5, task 4). NOT YET APPLIED — the
 * upsert below will fail with "relation push_tokens does not exist" until a
 * maintainer applies that migration. It's written now, callable today, and
 * fails soft (logged, swallowed) so nothing breaks in the meantime; it starts
 * working the moment the table exists. Also requires an EAS project id
 * (`extra.eas.projectId` in app.json, set by `eas init`) — until that's
 * configured, registration no-ops with a console warning instead of throwing.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

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
 * Bypasses the typed RPC map deliberately: push_tokens and its functions are
 * defined in sql/push_tokens.sql but intentionally excluded from
 * database.types.ts (auto-generated ground truth from the live DB) until that
 * migration is applied — hand-adding them would make the file lie about the
 * live schema. Regenerate types and drop this cast once the migration lands.
 *
 * Fails soft: until the migration is applied the RPC does not exist and the
 * error is logged and swallowed, exactly as before.
 */
export async function upsertPushToken(
  expoToken: string,
  platform: PushPlatform
): Promise<void> {
  const { error } = await supabase.rpc("claim_push_token" as unknown as never, {
    p_token: expoToken,
    p_platform: platform,
  } as never);
  if (error) {
    console.warn(
      "[push] token claim failed (push_tokens migration likely not applied yet):",
      error.message
    );
  }
}

/** One-shot: register + persist. Never throws — safe to fire-and-forget. */
export async function registerAndSavePushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  const platform: PushPlatform = Platform.OS === "ios" ? "ios" : "android";
  await upsertPushToken(token, platform);
}
