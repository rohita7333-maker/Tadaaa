import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Durable audit log for auth + account-mutation events.
 *
 * Routing:
 *   - `userId` is set       → user-context client (cookie-bound). The
 *     `self-insert` RLS policy on `account_audit` requires
 *     `auth.uid() = user_id`, so the row is rejected unless the caller is
 *     actually that user.
 *   - `userId` is null      → service-role admin client. Pre-auth events
 *     (magic-link, signup, failed sign-in, password-reset) have no session;
 *     RLS would block them otherwise. The service role bypasses RLS.
 *
 * This split prevents the spam vector where an authenticated user could insert
 * NULL-userId rows with arbitrary action/meta payloads through the user
 * client.
 *
 * REQUIRED MIGRATION: `sql/account_audit.sql` must be applied in Supabase
 * before any audit insert will succeed. Failures here are swallowed and
 * logged so they can NEVER break the user's auth flow.
 *
 * Caller convention: wrap calls in `after()` from `next/server` so the
 * response isn't blocked by the audit insert.
 *
 * Never log secrets, passwords, tokens, or full email addresses in `meta`.
 */
export async function logAudit(params: {
  userId: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    const supabase =
      params.userId === null ? createAdminClient() : await createClient();
    const { error } = await supabase.from("account_audit").insert({
      user_id: params.userId,
      action: params.action,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      meta: params.meta ?? null,
    });
    if (error) {
      console.error("[audit] insert failed:", error.message);
    }
  } catch (e) {
    // Swallow — audit must NEVER break the user flow.
    console.error("[audit] unexpected:", e);
  }
}

/**
 * Best-effort request metadata for audit rows. Pulls IP + UA from the current
 * request headers. Safe to call from any server action.
 */
export async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent");
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}
