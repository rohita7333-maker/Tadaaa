import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Eye, Heart, MessageCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardUser } from "@/lib/dashboard-data";
import {
  ACTIVITY_FEED_CAP,
  buildActivityFeed,
  describeActivity,
  filterByFocus,
  groupByInvite,
  parseFocus,
  type ActivityEvent,
  type ActivityFocus,
} from "@/lib/activity-feed";

interface Props {
  searchParams: Promise<{ focus?: string }>;
}

const FOCUS_TABS: { key: ActivityFocus; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "views", label: "Opens" },
  { key: "rsvps", label: "RSVPs" },
  { key: "answers", label: "Answers" },
];

const KIND_STYLE = {
  view: { icon: Eye, color: "#8A6F35", tint: "#8A6F3515" },
  rsvp: { icon: Heart, color: "#3E6B5C", tint: "#3E6B5C15" },
  answer: { icon: MessageCircle, color: "#6B8F71", tint: "#6B8F7115" },
} as const;

/**
 * Activity — the "who" behind the dashboard's aggregate numbers.
 *
 * Every read is scoped to the signed-in creator's own invites: the invite list
 * is fetched with `creator_id = user.id`, every child query is constrained to
 * those ids, and `buildActivityFeed` drops anything that can't be tied back to
 * one of them. Guest names are the only recipient-supplied strings rendered and
 * they are sanitized + length-capped in the feed builder.
 */
export default async function ActivityPage({ searchParams }: Props) {
  const { focus: rawFocus } = await searchParams;
  const focus = parseFocus(rawFocus);

  const user = await getDashboardUser();
  if (!user) redirect("/auth/signin");

  const supabase = await createClient();

  const { data: inviteRows } = await supabase
    .from("invites")
    .select("id, title, slug")
    .eq("creator_id", user.id)
    .is("deleted_at", null);

  const invites = (inviteRows ?? []).map((inv) => ({
    id: inv.id as string,
    title: (inv.title as string) ?? "Untitled surprise",
    slug: inv.slug as string,
  }));
  const inviteIds = invites.map((inv) => inv.id);

  let events: ActivityEvent[] = [];

  if (inviteIds.length > 0) {
    // Three creator-scoped reads in parallel; answers need the question ids
    // first because invite_answers only joins to an invite through its question.
    const [viewsRes, rsvpsRes, questionsRes] = await Promise.all([
      supabase
        .from("invite_views")
        .select("id, invite_id, viewed_at")
        .in("invite_id", inviteIds)
        .order("viewed_at", { ascending: false })
        .limit(ACTIVITY_FEED_CAP),
      supabase
        .from("invite_rsvps")
        .select("id, invite_id, responded_at, name")
        .in("invite_id", inviteIds)
        .order("responded_at", { ascending: false })
        .limit(ACTIVITY_FEED_CAP),
      supabase
        .from("invite_questions")
        .select("id, invite_id, question_text")
        .in("invite_id", inviteIds),
    ]);

    const questions = (questionsRes.data ?? []).map((q) => ({
      id: q.id as string,
      invite_id: q.invite_id as string,
      question_text: (q.question_text as string) ?? "",
    }));

    const questionIds = questions.map((q) => q.id);
    const answersRes = questionIds.length
      ? await supabase
          .from("invite_answers")
          .select("id, question_id, answer, answered_at")
          .in("question_id", questionIds)
          .order("answered_at", { ascending: false })
          .limit(ACTIVITY_FEED_CAP)
      : { data: [] };

    events = buildActivityFeed({
      views: viewsRes.data ?? [],
      rsvps: rsvpsRes.data ?? [],
      answers: answersRes.data ?? [],
      questions,
      ownedInviteIds: inviteIds,
    });
  }

  const visible = filterByFocus(events, focus);
  const groups = groupByInvite(visible, invites);
  const isCapped = events.length === ACTIVITY_FEED_CAP;

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors mb-5 focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40 rounded-lg"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-3xl text-[#1A1B18]">Activity</h1>
        <p className="text-[#6F6E68] mt-1 text-sm">
          {events.length === 0
            ? "Nothing yet — the moment someone opens a surprise, it lands here."
            : "Who opened, who's coming, and what they answered — newest first."}
        </p>
      </div>

      {/* Focus tabs */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {FOCUS_TABS.map((tab) => {
            const count =
              tab.key === "all" ? events.length : filterByFocus(events, tab.key).length;
            const active = tab.key === focus;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/dashboard/activity" : `/dashboard/activity?focus=${tab.key}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40 ${
                  active
                    ? "bg-[#FFF0EE] border-[#3E6B5C] text-[#3E6B5C]"
                    : "bg-white border-[#E9E6DF]/60 text-[#6F6E68] hover:border-[#3E6B5C]/40 hover:text-[#1A1B18]"
                }`}
              >
                {tab.label}
                <span className={active ? "text-[#3E6B5C]/70" : "text-[#9B8E87]"}>{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty — nothing anywhere */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FFF0E8] to-[#F1EFE9] flex items-center justify-center mb-5 shadow-[0_8px_32px_rgba(62, 107, 92,0.15)]">
            <Sparkles className="w-8 h-8 text-[#3E6B5C]" />
          </div>
          <h2 className="font-heading text-xl text-[#1A1B18] mb-2">No activity yet</h2>
          <p className="text-[#6F6E68] max-w-sm text-sm leading-relaxed mb-6">
            Share a surprise link and every open, RSVP and answer shows up here — your
            own previews never count.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center h-11 px-6 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white font-semibold text-sm transition-all duration-300 hover:scale-[1.02] shadow-md shadow-[#3E6B5C]/20"
          >
            Back to your surprises
          </Link>
        </div>
      )}

      {/* Empty — this filter only */}
      {events.length > 0 && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="text-[#6F6E68] text-sm">Nothing in this filter yet.</p>
          <Link
            href="/dashboard/activity"
            className="text-[#3E6B5C] text-sm hover:underline mt-2 font-medium"
          >
            Show everything
          </Link>
        </div>
      )}

      {/* Grouped feed */}
      <div className="space-y-5">
        {groups.map((group) => (
          <section
            key={group.invite.id}
            className="bg-white rounded-2xl border border-[#E9E6DF]/30 shadow-[0_2px_12px_rgba(26, 27, 24,0.04)] overflow-hidden"
          >
            <header className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#E9E6DF]/30">
              <Link
                href={`/surprise/${group.invite.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading text-lg text-[#1A1B18] hover:text-[#3E6B5C] transition-colors truncate focus:outline-none focus:underline"
              >
                {group.invite.title}
              </Link>
              <span className="text-[11px] text-[#9B8E87] shrink-0">
                {group.events.length} {group.events.length === 1 ? "moment" : "moments"}
              </span>
            </header>

            <ul className="divide-y divide-[#E9E6DF]/20">
              {group.events.map((event) => {
                const style = KIND_STYLE[event.kind];
                const Icon = style.icon;
                return (
                  <li key={event.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: style.tint }}
                      aria-hidden="true"
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
                    </span>
                    <p className="flex-1 min-w-0 text-sm text-[#1A1B18] truncate">
                      {describeActivity(event)}
                    </p>
                    <time
                      dateTime={event.at}
                      className="text-[11px] text-[#9B8E87] shrink-0"
                    >
                      {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                    </time>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {isCapped && visible.length > 0 && (
        <p className="mt-6 text-center text-xs text-[#9B8E87]">
          Showing your {ACTIVITY_FEED_CAP} most recent moments. Open a surprise&apos;s
          insights for its full history.
        </p>
      )}
    </div>
  );
}
