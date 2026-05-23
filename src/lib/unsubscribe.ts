import { createHmac } from "crypto";

/**
 * One-way signed token over (userId, listKey) using CRON_SECRET as HMAC key.
 * Same secret is already required for the cron path, so no new env to manage.
 * "listKey" allows independent unsub for monthly recap vs answer pings vs view pings.
 */
function sign(userId: string, listKey: string): string {
  const secret = process.env.CRON_SECRET || "";
  return createHmac("sha256", secret)
    .update(`${userId}:${listKey}`)
    .digest("hex")
    .slice(0, 32);
}

export function unsubscribeUrl(
  baseUrl: string,
  userId: string,
  listKey: "monthly" | "weekly" | "view" | "answer"
): string {
  const token = sign(userId, listKey);
  const url = new URL(`${baseUrl}/api/unsubscribe`);
  url.searchParams.set("u", userId);
  url.searchParams.set("k", listKey);
  url.searchParams.set("t", token);
  return url.toString();
}

export function verifyUnsubscribe(
  userId: string,
  listKey: string,
  token: string
): boolean {
  if (!userId || !listKey || !token) return false;
  const expected = sign(userId, listKey);
  // Constant-time compare via length-equal + char xor accumulation.
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
