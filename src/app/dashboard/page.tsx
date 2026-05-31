import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Sparkles, Eye, Gift, TrendingUp, MessageCircle, Heart } from "lucide-react";
import InviteList from "@/components/dashboard/InviteList";
import OccasionFilter from "@/components/dashboard/OccasionFilter";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import CommandPalette from "@/components/dashboard/CommandPalette";

interface Props {
  searchParams: Promise<{ occasion?: string; sort?: string; status?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { occasion, sort, status: statusFilter } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  const creatorName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || undefined;

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

  const stats: { label: string; value: number; icon: typeof Gift; color: string; href: string; hint: string }[] = [
    { label: "Total Surprises", value: all.length, icon: Gift, color: "#C4686D", href: "/dashboard", hint: "All your surprises" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "#C9A96E", href: "/dashboard?sort=views", hint: "Sort by most viewed" },
    { label: "RSVPs", value: totalRsvps, icon: Heart, color: "#C4686D", href: "/dashboard?sort=rsvps", hint: "Sort by most RSVPs" },
    { label: "Responses", value: totalResponses, icon: MessageCircle, color: "#6B8F71", href: "/dashboard?sort=responses", hint: "Sort by responses" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "#B07CC6", href: "/dashboard?status=active", hint: "Filter to active surprises" },
  ];

  const occasionsInUse = Array.from(new Set(all.map((inv) => inv.occasion_type).filter(Boolean))) as string[];

  return (
    <div>
      <CommandPalette occasionsInUse={occasionsInUse} />
      <OnboardingModal forceShow={all.length === 0} />
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl text-[#2D2926]">Your Surprises</h1>
          <p className="text-[#6B5E57] mt-1 text-sm">
            {all.length === 0
              ? "Create your first surprise below"
              : `${all.length} surprise${all.length !== 1 ? "s" : ""} created`}
          </p>
        </div>
        <Link
          href="/create"
          className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-md shadow-[#C4686D]/20 text-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Surprise
        </Link>
      </div>

      {/* Stats strip — clickable filters/sorts */}
      {all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              title={s.hint}
              className="bg-white rounded-2xl p-4 border border-[#D4CBC3]/30 shadow-[0_2px_12px_rgba(45,41,38,0.04)] flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(45,41,38,0.10)] hover:border-[#C4686D]/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C4686D]/40"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15` }}
              >
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="font-heading text-xl text-[#2D2926] font-bold leading-none">
                  <AnimatedCounter value={s.value} />
                </p>
                <p className="text-[#6B5E57] text-xs mt-0.5">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Occasion filter */}
      {all.length > 0 && (
        <Suspense>
          <OccasionFilter current={occasion ?? null} />
        </Suspense>
      )}

      {/* Empty state — no invites at all */}
      {all.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFF0E8] to-[#F5EDE3] flex items-center justify-center mb-6 shadow-[0_8px_32px_rgba(196,104,109,0.15)]">
            <Sparkles className="w-10 h-10 text-[#C4686D]" />
          </div>
          <h2 className="font-heading text-2xl text-[#2D2926] mb-3">No surprises yet</h2>
          <p className="text-[#6B5E57] max-w-sm mb-8 text-sm leading-relaxed">
            Create your first surprise page and share it with someone you love. It only takes a few minutes!
          </p>
          <Link
            href="/create"
            className="inline-flex items-center h-12 px-8 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#C4686D]/25 pulse-glow text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first surprise
          </Link>
        </div>
      )}

      {/* Empty state — filter has no matches */}
      {all.length > 0 && list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[#6B5E57] text-sm">No surprises match this filter.</p>
          <Link
            href="/dashboard"
            className="text-[#C4686D] text-sm hover:underline mt-2 font-medium"
          >
            Clear filter
          </Link>
        </div>
      )}

      {/* Invite grid */}
      {list.length > 0 && (
        <InviteList
          creatorName={creatorName}
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
          }))}
        />
      )}

      {/* Mobile FAB */}
      <Link
        href="/create"
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(196,104,109,0.4)] hover:scale-110 transition-transform duration-300 z-50"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
