import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile, updateNotifications } from "@/actions/account";
import DeleteAccountButton from "./DeleteAccountButton";
import AvatarUpload from "./AvatarUpload";
import Link from "next/link";
import { ArrowLeft, User, Bell, ShieldAlert, Crown, Lock, Download, Sparkles } from "lucide-react";
import ChangePasswordForm from "./ChangePasswordForm";
import { SettingsSection, ToggleRow } from "./SettingsAnimated";

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
    <div className="min-h-screen relative overflow-hidden bg-[#FFF8F0]">
      {/* Decorative bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, #F8B4B8 0%, #FFE7D9 60%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, #FFC97A 0%, #FFE9C2 60%, transparent 100%)",
        }}
      />

      <div className="relative max-w-xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B5E57] hover:text-[#C4686D] transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to dashboard
        </Link>

        {/* Hero */}
        <SettingsSection index={0}>
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-[#D4CBC3]/60 shadow-sm backdrop-blur-sm mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#C4686D]" />
              <span className="text-xs font-medium text-[#6B5E57]">Your account</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl text-[#2D2926] tracking-tight">
              Settings
            </h1>
            <p className="text-[#6B5E57] mt-2 text-sm leading-relaxed max-w-md">
              Make TaDaaaa feel like you. Tweak your profile, notifications, and privacy
              from one calm place.
            </p>
          </div>
        </SettingsSection>

        {/* Account */}
        <SettingsSection
          index={1}
          className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-[0_8px_32px_rgba(45,41,38,0.08)] border border-white/60 mb-5"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFE7D9] to-[#F8B4B8]/60 flex items-center justify-center">
              <User className="w-4 h-4 text-[#B33A45]" />
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
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          index={2}
          className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-[0_8px_32px_rgba(45,41,38,0.08)] border border-white/60 mb-5"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFE9C2] to-[#FFC97A]/60 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#B6802A]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">Notifications</h2>
          </div>
          <form action={updateNotifications} className="space-y-1.5">
            {notifItems.map((item) => (
              <ToggleRow
                key={item.name}
                name={item.name}
                defaultChecked={item.defaultChecked}
                label={item.label}
                sub={item.sub}
              />
            ))}
            <button
              type="submit"
              className="mt-4 w-full h-11 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#C4686D]/20"
            >
              Save preferences
            </button>
          </form>
        </SettingsSection>

        {/* Security */}
        <SettingsSection
          index={3}
          className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-[0_8px_32px_rgba(45,41,38,0.08)] border border-white/60 mb-5"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F0E6F8] to-[#D4B8E0]/60 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#7B61A6]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">Security</h2>
          </div>
          <ChangePasswordForm />
        </SettingsSection>

        {/* Your Data */}
        <SettingsSection
          index={4}
          className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-[0_8px_32px_rgba(45,41,38,0.08)] border border-white/60 mb-5"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E6F2F0] to-[#7CC5C5]/40 flex items-center justify-center">
              <Download className="w-4 h-4 text-[#2B8A8A]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">Your Data</h2>
          </div>
          <p className="text-sm text-[#6B5E57] mb-4 leading-relaxed">
            Download a JSON copy of everything we store about you.
          </p>
          <Link
            href="/settings/data"
            className="inline-flex items-center gap-1.5 text-sm text-[#C4686D] hover:underline font-semibold"
          >
            Export my data →
          </Link>
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection
          index={5}
          className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-[0_8px_32px_rgba(45,41,38,0.08)] border border-red-100"
        >
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
        </SettingsSection>
      </div>
    </div>
  );
}
