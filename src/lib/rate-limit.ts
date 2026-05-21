import { createServiceClient } from "@/lib/supabase/server";

/**
 * Distributed rate limiter backed by Postgres via the `consume_rate_limit` RPC.
 * Works across serverless instances — unlike a per-process Map.
 *
 * Returns true when the call is allowed, false when blocked.
 * Fails OPEN on DB errors (logged) so a Supabase outage cannot lock everyone out.
 *
 * @param key       Unique key (e.g. "auth:signup:1.2.3.4" or "video:<userId>")
 * @param limit     Max calls per window
 * @param windowMs  Window size in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) {
      console.error("[rate-limit] RPC error:", error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("[rate-limit] Unexpected:", err);
    return true;
  }
}

/** Best-effort IP extraction from request headers. */
export function getIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
