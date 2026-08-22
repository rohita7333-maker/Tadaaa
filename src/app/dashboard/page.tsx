import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { LayoutTemplate, ArrowRight, BarChart3 } from "lucide-react";
import InviteList from "@/components/dashboard/InviteList";
import OccasionFilter from "@/components/dashboard/OccasionFilter";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import FreeLimitBanner from "@/components/dashboard/FreeLimitBanner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import CommandPalette from "@/components/dashboard/CommandPalette";
import Greeting from "@/components/dashboard/Greeting";
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
  const stats: { label: string; value: number; href: string; hint: string }[] = [
    { label: "Views", value: totalViews, href: "/dashboard/activity?focus=views", hint: "Times your surprise pages were opened (your own previews don't count) · click to see who" },
    { label: "RSVPs", value: totalRsvps, href: "/dashboard/activity?focus=rsvps", hint: "Guests who tapped “I'm in!” to confirm · click to see who" },
    { label: "Answers", value: totalResponses, href: "/dashboard/activity?focus=answers", hint: "Answers to the yes/no questions you added · click to see them" },
    { label: "Surprises", value: all.length, href: "/dashboard", hint: "Every surprise you've created" },
    { label: "Live", value: activeCount, href: "/dashboard?status=active", hint: "Surprises that are live right now · click to filter" },
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

      {/* Mockup `.phead` — greeting, count, primary action */}
      <div className="ed-phead">
        <div>
          <h1>
            <Greeting name={creatorName?.split(" ")[0]} />
          </h1>
          <div className="ed-sub">
            {all.length === 0
              ? "No surprises yet — the first one takes a few minutes"
              : `${all.length} surprise${all.length !== 1 ? "s" : ""} so far`}
          </div>
        </div>
        <Link href="/create" className="ed-btn ed-btn-coral">
          New surprise
        </Link>
      </div>

      {/* Mockup `.stats4` — the numbers, each drilling into the feed */}
      {all.length > 0 && (
        <div className="ed-stats">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} title={s.hint} className="ed-stat">
              <div className="ed-v">
                <AnimatedCounter value={s.value} />
              </div>
              <div className="ed-l">{s.label}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Drill-downs for the numbers above. The mockup wires its stat tiles
          straight into the analytics screen (`go('#analytics/s1')`); we keep the
          tiles pointed at the feed, which answers "who", and put the charts —
          which answer "how it's trending" — one deliberate click away here. */}
      {all.length > 0 && (
        <div className="-mt-5 mb-7 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/dashboard/activity" className="ed-tlink">
            See all activity →
          </Link>
          <Link href="/dashboard/analytics" className="ed-tlink">
            Full analytics →
          </Link>
        </div>
      )}

      {/* Mockup `.gr2` — surprises panel beside the activity panel */}
      <div className="ed-gr2">
        <div className="ed-panel">
          <h2>
            Your surprises
            {all.length > 0 && (
              <Link href="/templates" className="ed-tlink !text-xs">
                Start from a template
              </Link>
            )}
          </h2>

          {/* Occasion filter + sort */}
          {all.length > 0 && (
            <Suspense>
              <OccasionFilter current={occasion ?? null} />
            </Suspense>
          )}
          {all.length > 0 && (
            <div className="ed-chiprow">
              <span className="label self-center pr-1">Sort</span>
              {sortOptions.map((opt) => {
                const active = (sort ?? "") === opt.key;
                return (
                  <Link
                    key={opt.key || "newest"}
                    href={sortHref(opt.key)}
                    aria-current={active ? "true" : undefined}
                    className={`ed-chip !min-h-0 !px-3 !py-1.5 !text-xs ${
                      active ? "ed-chip-on" : ""
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Empty — nothing created yet */}
          {all.length === 0 && (
            <div className="ed-empty">
              No surprises yet.{" "}
              <Link href="/create" className="ed-tlink">
                Create one →
              </Link>
              <p className="mt-3 text-sm">
                Or{" "}
                <Link href="/templates" className="ed-tlink !text-sm">
                  start from a template
                </Link>{" "}
                — occasion, theme and reveal picked for you.
              </p>
            </div>
          )}

          {/* Empty — this filter only */}
          {all.length > 0 && list.length === 0 && (
            <div className="ed-empty">
              Nothing matches this filter.{" "}
              <Link href="/dashboard" className="ed-tlink">
                Clear filters
              </Link>
            </div>
          )}

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
                countdown_date: invite.countdown_date ?? null,
              }))}
            />
          )}
        </div>

        {/* Activity panel. The mockup renders a demo feed inline; ours links to
            the real one, which is creator-scoped, grouped and capped — see the
            divergence note in the phase report. */}
        <div className="ed-panel">
          <h2>
            Activity
            <Link href="/dashboard/activity" className="ed-tlink !text-xs">
              See responses
            </Link>
          </h2>
          {all.length === 0 ? (
            <p className="text-sm">
              The moment someone opens a surprise, it lands here.
            </p>
          ) : (
            <>
              <p className="text-sm">
                Every open, RSVP and answer, newest first and grouped by
                surprise. Your own previews never count.
              </p>
              <Link
                href="/dashboard/activity"
                className="ed-btn ed-btn-line ed-btn-sm ed-btn-block mt-4"
              >
                Open activity
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />
              </Link>
              <Link
                href="/dashboard/analytics"
                className="ed-btn ed-btn-line ed-btn-sm ed-btn-block mt-2"
              >
                <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.6} />
                Full analytics
              </Link>
              <Link
                href="/templates"
                className="ed-btn ed-btn-line ed-btn-sm ed-btn-block mt-2"
              >
                <LayoutTemplate className="w-3.5 h-3.5" strokeWidth={1.6} />
                Browse templates
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Bottom app bar clears the last row on mobile */}
      <div className="ed-appbar-gutter sm:hidden" aria-hidden="true" />
    </div>
  );
}
