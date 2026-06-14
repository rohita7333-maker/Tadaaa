import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/dashboard/Navbar";
import { signedAvatarUrl } from "@/actions/account";
import { getDashboardUser, getDashboardProfile } from "@/lib/dashboard-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getDashboardUser();

  if (!user) redirect("/auth/signin");

  const initial =
    (user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const supabase = await createClient();
  // Profile (cached, shared with page) + invite count run in parallel.
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
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar
        userEmail={user.email}
        userInitial={initial}
        avatarUrl={await signedAvatarUrl(profile?.avatar_url)}
        subscriptionTier={profile?.subscription_tier ?? "free"}
        inviteCount={inviteCount ?? 0}
        greetingName={greetingName}
      />
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
