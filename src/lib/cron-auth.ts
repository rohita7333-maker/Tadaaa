import { timingSafeEqual } from "crypto";

/**
 * Timing-safe Bearer token check for cron routes.
 * Prevents timing attacks that could reveal the secret length or content
 * by leaking response-time differences.
 */
export function safeBearerCheck(
  authHeader: string | null,
  secret: string
): boolean {
  if (!authHeader) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
