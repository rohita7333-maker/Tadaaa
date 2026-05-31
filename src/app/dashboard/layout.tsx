import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/dashboard/Navbar";
import { signedAvatarUrl } from "@/actions/account";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  const initial =
    (user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, avatar_url")
    .eq("id", user.id)
    .single();

  const { count: inviteCount } = await supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id);

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
