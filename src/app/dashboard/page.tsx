import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Sparkles, Eye, Gift, TrendingUp, MessageCircle, Heart, LayoutTemplate, ArrowRight, Activity, BarChart3 } from "lucide-react";
import InviteList from "@/components/dashboard/InviteList";
import OccasionFilter from "@/components/dashboard/OccasionFilter";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import FreeLimitBanner from "@/components/dashboard/FreeLimitBanner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import CommandPalette from "@/components/dashboard/CommandPalette";
import { getActiveTier, monthlyInviteLimit } from "@/lib/tier";
import { getDashboardUser, getDashboardProfile } from "@/lib/dashboard-data";

interface Props {
  searchParams: Promise<{ occasion?: string; sort?: string; status?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { occasion, sort, status: statusFilter } = await searchParams;

  const user = await getDashboardUser();

  if (!user) redirect("/auth/signin");

  const creatorName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || undefined;

  const supabase = await createClient();

  // Active tier drives the delete gate + free-tier upsell banner.
  // Cached fetch — already loaded by the dashboard layout this request.
  const profile = await getDashboardProfile(user.id);
  const tier = getActiveTier(profile ?? null);

  const { data: invites, error } = await supabase
    .from("invites")
    .select("*")
    .eq("creator_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load invites:", error);
  }

  const all = invites || [];

  // Free-tier monthly usage — mirrors the createInvite gate (is_active invites
  // created since the 1st of this month). Drives the upsell banner.
  const freeLimit = monthlyInviteLimit(tier);
  let limitReached = false;
  let usedThisMonth = 0;
  if (freeLimit !== null) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    usedThisMonth = all.filter(
      (inv) => inv.is_active && new Date(inv.created_at) >= monthStart
    ).length;
    limitReached = usedThisMonth >= freeLimit;
  }

  // Aggregate RSVP counts per invite (one query, group client-side).
  const inviteIds = all.map((inv) => inv.id);
  const rsvpMap: Record<string, number> = {};
  if (inviteIds.length > 0) {
    const { data: rsvpRows } = await supabase
      .from("invite_rsvps")
      .select("invite_id")
      .in("invite_id", inviteIds);
    for (const row of rsvpRows ?? []) {
      rsvpMap[row.invite_id] = (rsvpMap[row.invite_id] ?? 0) + 1;
    }
  }

  // Filter by occasion + status, sort by chosen metric.
  let list = all;
  if (occasion) list = list.filter((inv) => inv.occasion_type === occasion);
  if (statusFilter === "active") list = list.filter((inv) => inv.is_active);

  if (sort === "views") {
    list = [...list].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
  } else if (sort === "rsvps") {
    list = [...list].sort((a, b) => (rsvpMap[b.id] ?? 0) - (rsvpMap[a.id] ?? 0));
  } else if (sort === "responses") {
    list = [...list].sort((a, b) => (b.response_count ?? 0) - (a.response_count ?? 0));
  }

  const totalViews = all.reduce((sum, inv) => sum + (inv.view_count || 0), 0);
  const totalResponses = all.reduce((sum, inv) => sum + (inv.response_count || 0), 0);
  const totalRsvps = Object.values(rsvpMap).reduce((s, n) => s + n, 0);
  const activeCount = all.filter((inv) => inv.is_active).length;

  // The three engagement tiles drill into the Activity feed — the aggregate
  // number answers "how many", the feed answers "who". Sorting by the same
  // metrics moved to the explicit sort row below the filters.
  const stats: { label: string; value: number; icon: typeof Gift; color: string; href: string; hint: string }[] = [
    { label: "Total Surprises", value: all.length, icon: Gift, color: "#3E6B5C", href: "/dashboard", hint: "Every surprise you've created" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "#8A6F35", href: "/dashboard/activity?focus=views", hint: "Times your surprise pages were opened (your own previews don't count) · click to see who" },
    { label: "RSVPs", value: totalRsvps, icon: Heart, color: "#3E6B5C", href: "/dashboard/activity?focus=rsvps", hint: "Guests who tapped “I'm in!” to confirm · click to see who" },
    { label: "Responses", value: totalResponses, icon: MessageCircle, color: "#6B8F71", href: "/dashboard/activity?focus=answers", hint: "Answers to the yes/no questions you added · click to see them" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "#B07CC6", href: "/dashboard?status=active", hint: "Surprises that are live right now · click to filter" },
  ];

  // Sort controls — preserved from the old stat-tile links so the ?sort= params
  // keep an entry point now that the tiles drill into Activity instead.
  const sortOptions: { key: string; label: string }[] = [
    { key: "", label: "Newest" },
    { key: "views", label: "Most viewed" },
    { key: "rsvps", label: "Most RSVPs" },
    { key: "responses", label: "Most answers" },
  ];
  function sortHref(key: string): string {
    const params = new URLSearchParams();
    if (occasion) params.set("occasion", occasion);
    if (statusFilter) params.set("status", statusFilter);
    if (key) params.set("sort", key);
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  const occasionsInUse = Array.from(new Set(all.map((inv) => inv.occasion_type).filter(Boolean))) as string[];

  return (
    <div>
      <CommandPalette occasionsInUse={occasionsInUse} />
      <OnboardingModal forceShow={all.length === 0} />

      {/* Free-tier upsell — only once the monthly limit is hit */}
      {limitReached && freeLimit !== null && (
        <FreeLimitBanner used={usedThisMonth} limit={freeLimit} />
      )}
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl text-[#1A1B18]">Your Surprises</h1>
          <p className="text-[#6F6E68] mt-1 text-sm">
            {all.length === 0
              ? "Create your first surprise below"
              : `${all.length} surprise${all.length !== 1 ? "s" : ""} created`}
          </p>
        </div>
        <Link
          href="/create"
          className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-md shadow-[#3E6B5C]/20 text-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Surprise
        </Link>
      </div>

      {/* Start-from-a-template CTA — mirrors the stat card styling */}
      <Link
        href="/templates"
        className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[#E9E6DF]/30 shadow-[0_2px_12px_rgba(26,27,24,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,27,24,0.10)] hover:border-[#3E6B5C]/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40 mb-8"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#B07CC615" }}
        >
          <LayoutTemplate className="w-4 h-4" style={{ color: "#B07CC6" }} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[#1A1B18] text-sm">Start from a template</p>
          <p className="text-[#6F6E68] text-xs mt-0.5">
            Occasion, theme and reveal picked for you — just add your words
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#6F6E68] flex-shrink-0" />
      </Link>

      {/* Stats strip — clickable filters/sorts */}
      {all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              title={s.hint}
              className="bg-white rounded-2xl p-4 border border-[#E9E6DF]/30 shadow-[0_2px_12px_rgba(26,27,24,0.04)] flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,27,24,0.10)] hover:border-[#3E6B5C]/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15` }}
              >
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="font-heading text-xl text-[#1A1B18] font-bold leading-none">
                  <AnimatedCounter value={s.value} />
                </p>
                <p className="text-[#6F6E68] text-xs mt-0.5">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Drilldowns — the "who" and the "how it performed" behind the numbers */}
      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-5 mb-8 -mt-4">
          <Link
            href="/dashboard/activity"
            className="inline-flex items-center gap-1.5 text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40 rounded-lg"
          >
            <Activity className="w-3.5 h-3.5" />
            See all activity
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1.5 text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40 rounded-lg"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Occasion filter + sort */}
      {all.length > 0 && (
        <Suspense>
          <OccasionFilter current={occasion ?? null} />
        </Suspense>
      )}
      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-[#9B8E87] mr-1">Sort</span>
          {sortOptions.map((opt) => {
            const active = (sort ?? "") === opt.key;
            return (
              <Link
                key={opt.key || "newest"}
                href={sortHref(opt.key)}
                aria-current={active ? "true" : undefined}
                className={`h-8 inline-flex items-center px-3 rounded-full text-xs font-medium border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40 ${
                  active
                    ? "bg-[#FFF0EE] border-[#3E6B5C] text-[#3E6B5C]"
                    : "bg-white border-[#E9E6DF]/60 text-[#6F6E68] hover:border-[#3E6B5C]/40 hover:text-[#1A1B18]"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty state — no invites at all */}
      {all.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFF0E8] to-[#F1EFE9] flex items-center justify-center mb-6 shadow-[0_8px_32px_rgba(62,107,92,0.15)]">
            <Sparkles className="w-10 h-10 text-[#3E6B5C]" />
          </div>
          <h2 className="font-heading text-2xl text-[#1A1B18] mb-3">No surprises yet</h2>
          <p className="text-[#6F6E68] max-w-sm mb-8 text-sm leading-relaxed">
            Create your first surprise page and share it with someone you love. It only takes a few minutes!
          </p>
          <Link
            href="/create"
            className="inline-flex items-center h-12 px-8 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#3E6B5C]/25 pulse-glow text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first surprise
          </Link>
        </div>
      )}

      {/* Empty state — filter has no matches */}
      {all.length > 0 && list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[#6F6E68] text-sm">No surprises match this filter.</p>
          <Link
            href="/dashboard"
            className="text-[#3E6B5C] text-sm hover:underline mt-2 font-medium"
          >
            Clear filter
          </Link>
        </div>
      )}

      {/* Invite grid */}
      {list.length > 0 && (
        <InviteList
          creatorName={creatorName}
          tier={tier}
          invites={list.map((invite) => ({
            id: invite.id,
            slug: invite.slug,
            title: invite.title,
            theme: invite.theme,
            view_count: invite.view_count ?? 0,
            response_count: invite.response_count ?? 0,
            rsvp_count: rsvpMap[invite.id] ?? 0,
            is_active: invite.is_active,
            expires_at: invite.expires_at,
            created_at: invite.created_at,
            reveal_type: invite.reveal_type,
            accept_contributions: invite.accept_contributions ?? false,
            revealed_at: invite.revealed_at ?? null,
          }))}
        />
      )}

      {/* Mobile FAB */}
      <Link
        href="/create"
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(62,107,92,0.4)] hover:scale-110 transition-transform duration-300 z-50"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
