import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile, updateNotifications, signedAvatarUrl } from "@/actions/account";
import DeleteAccountButton from "./DeleteAccountButton";
import AvatarUpload from "./AvatarUpload";
import Link from "next/link";
import DashboardNavServer from "@/components/dashboard/DashboardNavServer";
import { signOut } from "@/actions/auth";
import ChangePasswordForm from "./ChangePasswordForm";
import { SavePreferencesButton, SettingsSection, ToggleRow } from "./SettingsAnimated";

export const metadata = { title: "Settings — TaDaaaa" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const profile = await getProfile();
  const avatarUrl = await signedAvatarUrl(profile?.avatar_url);

  const initial =
    (user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const tier = profile?.subscription_tier ?? "free";
  const tierLabel =
    tier === "unlimited" ? "Unlimited" : tier === "plus" ? "Plus" : "Free";

  const notifItems = [
    { name: "notify_on_view", label: "Someone views your surprise", sub: "Get notified when your link gets opened", defaultChecked: profile?.notify_on_view ?? false },
    { name: "notify_on_answer", label: "Someone answers a question", sub: "Get notified when they respond yes or no", defaultChecked: profile?.notify_on_answer ?? true },
    { name: "notify_occasions", label: "Occasion reminders", sub: "Reminders for upcoming birthdays & events", defaultChecked: profile?.notify_occasions ?? true },
  ];

  return (
    <div className="min-h-screen bg-paper">
      {/* Same authenticated bar as every other product surface — it carries the
          logo, the product nav and the mobile app bar, so the page needs no
          separate back link. */}
      <DashboardNavServer activeRoute="settings" />

      {/* Mockup `.wrap.wrap-n` — a single 560px column of `.setrow`s under one
          headline. No section cards, no decorative blooms: the mockup's
          settings screen is a plain hairline-separated list. */}
      <div className="max-w-[560px] mx-auto px-5 sm:px-6 pt-8 pb-16">
        <SettingsSection index={0}>
          <div className="ed-phead">
            <h1>Settings</h1>
          </div>
        </SettingsSection>

        <SettingsSection index={1}>
          <div className="ed-setrow">
            <AvatarUpload currentUrl={avatarUrl} userInitial={initial} />
          </div>

          <div className="ed-setrow">
            <div className="ed-m">
              <h2>Email</h2>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="ed-setrow">
            <div className="ed-m">
              <h2>Current plan: {tierLabel}</h2>
              <p>
                {tier === "free"
                  ? "Upgrade anytime."
                  : profile?.subscription_expires_at
                  ? `Renews ${new Date(profile.subscription_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
                  : "Thanks for supporting TaDaaaa."}
              </p>
            </div>
            {tier === "free" && (
              <Link href="/pricing" className="ed-btn ed-btn-ink ed-btn-sm">
                Upgrade
              </Link>
            )}
          </div>
        </SettingsSection>

        {/* Notifications — each row is a `.setrow` with a `.sw` switch */}
        <SettingsSection index={2}>
          <form action={updateNotifications}>
            {notifItems.map((item) => (
              <ToggleRow
                key={item.name}
                name={item.name}
                defaultChecked={item.defaultChecked}
                label={item.label}
                sub={item.sub}
              />
            ))}
            <SavePreferencesButton />
          </form>
        </SettingsSection>

        <SettingsSection index={3}>
          <div className="ed-setrow !block">
            <div className="ed-m mb-4">
              <h2>Password</h2>
              <p>Change the password you sign in with.</p>
            </div>
            <ChangePasswordForm />
          </div>
        </SettingsSection>

        <SettingsSection index={4}>
          <div className="ed-setrow">
            <div className="ed-m">
              <h2>Download your data</h2>
              <p>Everything we store about you, in one JSON file.</p>
            </div>
            <Link href="/settings/data" className="ed-btn ed-btn-line ed-btn-sm">
              Export
            </Link>
          </div>

          <div className="ed-setrow ed-setrow-danger">
            <div className="ed-m">
              <h2>Delete account</h2>
              <p>Permanent. Every surprise and message goes with it.</p>
            </div>
            <DeleteAccountButton />
          </div>
        </SettingsSection>

        <form action={signOut} className="mt-6">
          <button type="submit" className="ed-tlink">
            Sign out
          </button>
        </form>

        <div className="ed-appbar-gutter sm:hidden" aria-hidden="true" />
      </div>
    </div>
  );
}
