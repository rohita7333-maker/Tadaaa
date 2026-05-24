import { createHmac } from "crypto";

const TOKEN_EXPIRY_DAYS = 90;

/**
 * One-way signed token over (userId, listKey, day) using CRON_SECRET as HMAC key.
 * The day (days since Unix epoch, floored) bounds token lifetime to TOKEN_EXPIRY_DAYS.
 * Same secret is already required for the cron path, so no new env to manage.
 */
function sign(userId: string, listKey: string, day: number): string {
  const secret = process.env.CRON_SECRET || "";
  return createHmac("sha256", secret)
    .update(`${userId}:${listKey}:${day}`)
    .digest("hex")
    .slice(0, 32);
}

function today(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export function unsubscribeUrl(
  baseUrl: string,
  userId: string,
  listKey: "monthly" | "weekly" | "view" | "answer"
): string {
  const day = today();
  const token = sign(userId, listKey, day);
  const url = new URL(`${baseUrl}/api/unsubscribe`);
  url.searchParams.set("u", userId);
  url.searchParams.set("k", listKey);
  url.searchParams.set("d", String(day));
  url.searchParams.set("t", token);
  return url.toString();
}

export function verifyUnsubscribe(
  userId: string,
  listKey: string,
  token: string,
  dayParam: string
): boolean {
  if (!userId || !listKey || !token || !dayParam) return false;
  const day = parseInt(dayParam, 10);
  if (isNaN(day)) return false;
  if (today() - day > TOKEN_EXPIRY_DAYS) return false;
  const expected = sign(userId, listKey, day);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
