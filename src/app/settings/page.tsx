import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile, updateNotifications } from "@/actions/account";
import DeleteAccountButton from "./DeleteAccountButton";
import AvatarUpload from "./AvatarUpload";
import Link from "next/link";
import { ArrowLeft, User, Bell, ShieldAlert, Crown, Lock } from "lucide-react";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = { title: "Settings — TaDaaaa" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const profile = await getProfile();

  const initial =
    (user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const tier = profile?.subscription_tier ?? "free";
  const tierLabel =
    tier === "unlimited" ? "Unlimited" : tier === "plus" ? "Plus" : "Free";
  const tierColor =
    tier === "unlimited"
      ? "bg-amber-50 text-amber-800 border border-amber-200"
      : tier === "plus"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-[#F5EDE3] text-[#6B5E57] border border-[#D4CBC3]";

  const notifItems = [
    { name: "notify_on_view", label: "Someone views your surprise", sub: "Get notified when your link gets opened", defaultChecked: profile?.notify_on_view ?? false },
    { name: "notify_on_answer", label: "Someone answers a question", sub: "Get notified when they respond yes or no", defaultChecked: profile?.notify_on_answer ?? true },
    { name: "notify_occasions", label: "Occasion reminders", sub: "Reminders for upcoming birthdays & events", defaultChecked: profile?.notify_occasions ?? true },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0] py-10 px-6">
      <div className="max-w-xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B5E57] hover:text-[#C4686D] transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to dashboard
        </Link>

        <h1 className="font-heading text-3xl text-[#2D2926] mb-8">Settings</h1>

        {/* Account */}
        <section className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
              <User className="w-4 h-4 text-[#C4686D]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">Account</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-[#FFF8F0] rounded-2xl p-4">
              <AvatarUpload currentUrl={profile?.avatar_url} userInitial={initial} />
            </div>
            <div className="bg-[#FFF8F0] rounded-2xl p-4">
              <p className="text-xs text-[#6B5E57] uppercase tracking-wider mb-1 font-medium">Email</p>
              <p className="text-[#2D2926] font-medium text-sm">{user.email}</p>
            </div>
            <div className="bg-[#FFF8F0] rounded-2xl p-4">
              <p className="text-xs text-[#6B5E57] uppercase tracking-wider mb-2 font-medium">Plan</p>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${tierColor}`}>
                  {tier !== "free" && <Crown className="w-3 h-3" />}
                  {tierLabel}
                </span>
                {tier === "free" && (
                  <Link href="/pricing" className="text-xs text-[#C4686D] hover:underline font-semibold">
                    Upgrade →
                  </Link>
                )}
              </div>
            </div>
            {profile?.subscription_expires_at && (
              <div className="bg-[#FFF8F0] rounded-2xl p-4">
                <p className="text-xs text-[#6B5E57] uppercase tracking-wider mb-1 font-medium">Renews</p>
                <p className="text-[#2D2926] text-sm font-medium">
                  {new Date(profile.subscription_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#C4686D]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">Notifications</h2>
          </div>
          <form action={updateNotifications} className="space-y-3">
            {notifItems.map((item) => (
              <label
                key={item.name}
                className="flex items-start justify-between gap-4 cursor-pointer p-4 rounded-2xl hover:bg-[#FFF8F0] transition-colors group"
              >
                <div>
                  <p className="text-sm text-[#2D2926] font-medium">{item.label}</p>
                  <p className="text-xs text-[#6B5E57] mt-0.5">{item.sub}</p>
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    name={item.name}
                    defaultChecked={item.defaultChecked}
                    className="w-4 h-4 accent-[#C4686D] cursor-pointer"
                  />
                </div>
              </label>
            ))}
            <button
              type="submit"
              className="mt-3 w-full h-11 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#C4686D]/20"
            >
              Save preferences
            </button>
          </form>
        </section>

        {/* Security */}
        <section className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#C4686D]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">Security</h2>
          </div>
          <ChangePasswordForm />
        </section>

        {/* Danger zone */}
        <section className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-red-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="font-heading text-lg text-red-600">Danger zone</h2>
          </div>
          <p className="text-sm text-[#6B5E57] mb-5 leading-relaxed">
            Permanently delete your account and all surprises. This cannot be undone.
          </p>
          <DeleteAccountButton />
        </section>
      </div>
    </div>
  );
}
