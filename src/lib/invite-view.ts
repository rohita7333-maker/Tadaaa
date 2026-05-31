import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { inviteViewedEmail } from "@/lib/email/templates";

/**
 * Record an invite view, increment count atomically, and fire the first-view
 * email if applicable. Returns the new count, or null on validation/not-found.
 *
 * Shared between the public POST /api/invite/view route and the SSR fire-and-
 * forget call from app/surprise/[slug]/page.tsx — avoids the env-URL hop and
 * the silent failure when NEXT_PUBLIC_APP_URL is unset.
 */
export async function logInviteViewBySlug(
  slug: string,
  ua: string,
  ip: string
): Promise<{ ok: boolean; status?: number; count?: number }> {
  if (!slug || typeof slug !== "string") {
    return { ok: false, status: 400 };
  }
  if (!(await rateLimit(`view:${ip}`, 20, 60_000))) {
    return { ok: false, status: 429 };
  }

  // Anon client — invites table has public SELECT policy for active invites.
  const supabase = await createClient();

  // invites has no `status` column (split-brain schema retired) — gate on
  // is_active + expires_at only. Selecting a missing column errors the query
  // and silently 404s, which froze the view counter.
  const { data: invite } = await supabase
    .from("invites")
    .select("id, is_active, creator_id, title, expires_at")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  const isExpired =
    invite?.expires_at && new Date(invite.expires_at) < new Date();

  if (!invite || !invite.is_active || isExpired) {
    return { ok: false, status: 404 };
  }

  // Don't count the creator's own previews. A creator opening their own link
  // would otherwise inflate views AND stamp revealed_at (starting the 28-day
  // free-tier clock) before any recipient ever sees the surprise.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === invite.creator_id) {
    return { ok: true };
  }

  // increment_view_count has SECURITY DEFINER + GRANT to anon — no service-role needed.
  const { data: newCount } = await supabase.rpc("increment_view_count", {
    invite_id: invite.id,
  });

  // Notification side-effects use the admin client (no RLS policies on invite_views/profiles
  // for anon writes, and auth.admin.getUserById requires service-role regardless).
  const admin = createAdminClient();

  await admin.from("invite_views").insert({
    invite_id: invite.id,
    user_agent: ua.slice(0, 255),
  });

  if (newCount === 1) {
    // notify_on_view defaults to true. Use maybeSingle + null-coalesce so a
    // user with no profile row (legacy or just-confirmed) still gets notified.
    // Upsert a default row to plug the hole going forward.
    const { data: profile } = await admin
      .from("profiles")
      .select("notify_on_view")
      .eq("id", invite.creator_id)
      .maybeSingle();

    if (!profile) {
      await admin.from("profiles").upsert({
        id: invite.creator_id,
        notify_on_view: true,
        notify_on_answer: true,
        notify_occasions: true,
      });
    }

    const wantsNotify = profile?.notify_on_view ?? true;
    if (wantsNotify) {
      const { data: authUser } = await admin.auth.admin.getUserById(invite.creator_id);
      if (authUser?.user?.email) {
        const name = (authUser.user.user_metadata?.full_name as string) || "there";
        const dashUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app"}/dashboard`;
        const email = inviteViewedEmail(name, invite.title, dashUrl);
        sendEmail(authUser.user.email, email.subject, email.html).catch(() => {});
      }
    }
  }

  return { ok: true, count: typeof newCount === "number" ? newCount : undefined };
}
