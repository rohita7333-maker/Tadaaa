import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardUser } from "@/lib/dashboard-data";
import InviteSwitcher from "@/components/dashboard/InviteSwitcher";
import {
  buildViewSeries,
  buildFunnel,
  buildEmojiBreakdown,
  buildResponseFeed,
  describeReaction,
} from "@/lib/analytics-dashboard";

interface Props {
  searchParams: Promise<{ invite?: string }>;
}

/**
 * Per-invite analytics.
 *
 * Every panel is derived from rows that exist. Three metrics from the design
 * mock are deliberately absent because no data backs them: unique visitors
 * (views carry no visitor identity), reveal-completion rate (no per-visitor
 * completion event), and viewer geography (IPs are hashed at the boundary and
 * never stored). Inventing them would be prettier and false.
 *
 * Scoping: the invite list is fetched with `creator_id = user.id` and the
 * `?invite=` param is resolved *against that list*, so a guessed id belonging
 * to someone else falls back to the caller's own first invite.
 */
export default async function AnalyticsPage({ searchParams }: Props) {
  const { invite: requestedId } = await searchParams;

  const user = await getDashboardUser();
  if (!user) redirect("/auth/signin");

  const supabase = await createClient();

  const { data: inviteRows } = await supabase
    .from("invites")
    .select("id, title, slug, created_at")
    .eq("creator_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const invites = (inviteRows ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || "Untitled surprise",
    slug: row.slug as string,
  }));

  if (invites.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Header />
        <div className="rounded-2xl border border-[#E9E6DF] bg-white p-12 text-center">
          <Sparkles className="w-6 h-6 text-[#3E6B5C] mx-auto mb-3" />
          <h2 className="font-heading text-xl text-[#1A1B18] mb-2">
            Nothing to measure yet
          </h2>
          <p className="text-sm text-[#6F6E68] mb-6">
            Publish a surprise and this page fills up as people open it.
          </p>
          <Link
            href="/create"
            className="inline-flex h-11 px-6 items-center rounded-full bg-[#3E6B5C] text-white text-sm font-semibold hover:bg-[#2E5145] transition-colors"
          >
            Create a surprise
          </Link>
        </div>
      </div>
    );
  }

  // Resolving against the caller's own list is the authorization check.
  const selected = invites.find((i) => i.id === requestedId) ?? invites[0];

  const [viewsRes, reactionsRes, rsvpsRes, contributionsRes] = await Promise.all([
    supabase.from("invite_views").select("viewed_at").eq("invite_id", selected.id),
    supabase.from("invite_reactions").select("emoji").eq("invite_id", selected.id),
    supabase
      .from("invite_rsvps")
      .select("name, responded_at")
      .eq("invite_id", selected.id),
    supabase
      .from("invite_contributions")
      .select("contributor_name, message, photo_url, created_at")
      .eq("invite_id", selected.id)
      .eq("moderation_status", "approved"),
  ]);

  const views = viewsRes.data ?? [];
  const reactions = reactionsRes.data ?? [];
  const rsvps = rsvpsRes.data ?? [];
  const contributions = contributionsRes.data ?? [];

  const viewCount = views.length;
  const reactionCount = reactions.length;
  const responders = rsvps.length + contributions.length;
  const responseRate =
    viewCount > 0 ? Math.min(100, Math.round((responders / viewCount) * 100)) : 0;

  const series = buildViewSeries(views, new Date());
  const funnel = buildFunnel({ views: viewCount, responders, reactions: reactionCount });
  const emojiRows = buildEmojiBreakdown(reactions);
  const feed = buildResponseFeed({ rsvps, contributions });

  const peak = Math.max(...series.map((d) => d.count), 1);
  // An invite can have plenty of lifetime views yet none this week — say that
  // rather than drawing seven flat stubs that read as a broken chart.
  const viewsThisWeek = series.reduce((sum, day) => sum + day.count, 0);

  const stats = [
    { label: "Views", value: viewCount, hint: "Opens by recipients — your own previews aren't counted" },
    { label: "RSVPs", value: rsvps.length, hint: "Guests who confirmed they're in" },
    { label: "Response rate", value: `${responseRate}%`, hint: "Share of opens that led to an RSVP or a contribution" },
    { label: "Reactions", value: reactionCount, hint: "Emoji reactions left on the reveal" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <Header subtitle={selected.title} />
        <InviteSwitcher invites={invites} selectedId={selected.id} />
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            title={stat.hint}
            className="rounded-2xl border border-[#E9E6DF] bg-white px-6 py-5"
          >
            <div className="font-heading text-4xl text-[#1A1B18] tracking-tight leading-none mb-2">
              {stat.value}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6E68]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Views — last 7 days */}
        <section className="rounded-2xl border border-[#E9E6DF] bg-white p-6">
          <h2 className="font-heading text-lg text-[#1A1B18] mb-6">Views — last 7 days</h2>
          {viewsThisWeek === 0 ? (
            <EmptyNote>
              {viewCount === 0
                ? "No opens recorded yet."
                : `No opens in the last 7 days — all ${viewCount} are older.`}
            </EmptyNote>
          ) : (
            <div className="flex items-end justify-between gap-2 h-[180px]">
              {series.map((day) => (
                <div key={day.isoDate} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full rounded-t-md bg-[#3E6B5C] min-h-[4px]"
                    style={{ height: `${Math.round((day.count / peak) * 100)}%` }}
                    title={`${day.count} view${day.count === 1 ? "" : "s"} on ${day.isoDate}`}
                  />
                  <span className="text-[11px] text-[#6F6E68]">{day.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Funnel */}
        <section className="rounded-2xl border border-[#E9E6DF] bg-white p-6">
          <h2 className="font-heading text-lg text-[#1A1B18] mb-6">Funnel</h2>
          {viewCount === 0 ? (
            <EmptyNote>Nothing to chart until the first open.</EmptyNote>
          ) : (
            <div className="space-y-4">
              {funnel.map((stage) => (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="text-sm text-[#6F6E68] w-24 shrink-0">{stage.label}</span>
                  <div className="flex-1 h-8 rounded-md bg-[#F4F2ED] overflow-hidden">
                    <div
                      className="h-full rounded-md bg-[#3E6B5C] flex items-center px-2.5 min-w-[3rem]"
                      style={{ width: `${Math.max(stage.pct, 12)}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{stage.pct}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#6F6E68] w-8 text-right shrink-0">
                    {stage.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reaction mix — replaces the mock's geography panel, which no stored data supports */}
        <section className="rounded-2xl border border-[#E9E6DF] bg-white p-6">
          <h2 className="font-heading text-lg text-[#1A1B18] mb-6">Reaction mix</h2>
          {emojiRows.length === 0 ? (
            <EmptyNote>No reactions yet.</EmptyNote>
          ) : (
            <ul>
              {emojiRows.map((row) => {
                const { glyph, label } = describeReaction(row.emoji);
                return (
                  <li
                    key={row.emoji}
                    className="flex items-center justify-between py-3 border-b border-[#E9E6DF] last:border-0"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {glyph && (
                        <span className="text-xl leading-none" aria-hidden="true">
                          {glyph}
                        </span>
                      )}
                      <span className="text-sm text-[#1A1B18] truncate">{label}</span>
                      <span className="text-xs text-[#6F6E68] shrink-0">{row.pct}%</span>
                    </span>
                    <span className="text-sm font-semibold text-[#1A1B18]">{row.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Contributions & RSVPs */}
      <section className="rounded-2xl border border-[#E9E6DF] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg text-[#1A1B18]">Contributions &amp; RSVPs</h2>
          <Link
            href="/dashboard/activity"
            className="text-sm text-[#3E6B5C] hover:text-[#2E5145] font-medium transition-colors"
          >
            See all activity
          </Link>
        </div>
        {feed.length === 0 ? (
          <EmptyNote>No RSVPs or contributions yet.</EmptyNote>
        ) : (
          <ul>
            {feed.map((item, i) => (
              <li
                key={`${item.at}-${i}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3.5 border-b border-[#E9E6DF] last:border-0"
              >
                <span className="text-sm font-semibold text-[#1A1B18] truncate">{item.name}</span>
                <span className="text-sm text-[#6F6E68]">{item.detail}</span>
                <span className="text-xs text-[#6F6E68] w-20 text-right">
                  {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Honest about the gaps rather than filling them with plausible numbers. */}
      <p className="text-xs text-[#6F6E68] mt-6 leading-relaxed">
        Unique visitors, reveal-completion rate and viewer locations aren&apos;t shown:
        opens carry no visitor identity and IP addresses are hashed on arrival, so
        TaDaaaa genuinely cannot compute them today.
      </p>
    </div>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-1.5 text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors mb-3"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        Dashboard
      </Link>
      <h1 className="font-heading text-4xl text-[#1A1B18] tracking-tight">Analytics</h1>
      {subtitle && <p className="text-sm text-[#6F6E68] mt-1">&ldquo;{subtitle}&rdquo;</p>}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#6F6E68] py-6">{children}</p>;
}

export const metadata = {
  title: "Analytics — TaDaaaa",
};
