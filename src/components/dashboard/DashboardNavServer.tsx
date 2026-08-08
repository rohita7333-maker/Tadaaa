import { createClient } from "@/lib/supabase/server";
import { signedAvatarUrl } from "@/actions/account";
import { getDashboardUser, getDashboardProfile } from "@/lib/dashboard-data";
import Navbar from "@/components/dashboard/Navbar";
import type { ProductRoute } from "@/components/dashboard/nav-items";

/**
 * Self-fetching authenticated header — the same account bar the dashboard
 * layout renders (avatar dropdown, greeting, tier badge, invite count).
 *
 * Lets non-dashboard routes (e.g. /templates) show the signed-in chrome
 * without duplicating the prop-wiring, so a logged-in visitor never sees the
 * public "Sign in / Sign up" bar and thinks they were logged out.
 *
 * Renders nothing when there is no session — the caller falls back to the
 * marketing Navbar for signed-out visitors.
 */
export default async function DashboardNavServer({
  activeRoute,
}: {
  activeRoute?: ProductRoute;
} = {}) {
  const user = await getDashboardUser();
  if (!user) return null;

  const initial =
    (user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const supabase = await createClient();
  const [profile, { count: inviteCount }] = await Promise.all([
    getDashboardProfile(user.id),
    supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", user.id),
  ]);

  const greetingName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || undefined;

  return (
    <Navbar
      userEmail={user.email}
      userInitial={initial}
      avatarUrl={await signedAvatarUrl(profile?.avatar_url)}
      subscriptionTier={profile?.subscription_tier ?? "free"}
      inviteCount={inviteCount ?? 0}
      greetingName={greetingName}
      activeRoute={activeRoute}
    />
  );
}
