import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
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
      <div className="ed-phead">
        <div>
          <Link
            href="/dashboard"
            className="ed-tlink !text-stone inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
            Dashboard
          </Link>
          <h1 className="mt-1.5">Activity</h1>
          <div className="ed-sub">
            {events.length === 0
              ? "Nothing yet — the moment someone opens a surprise, it lands here."
              : "Who opened, who's coming, and what they answered — newest first."}
          </div>
        </div>
      </div>

      {/* Focus chips — mockup `.chip` / `.chip.on` (L283) */}
      {events.length > 0 && (
        <div className="ed-chiprow">
          {FOCUS_TABS.map((tab) => {
            const count =
              tab.key === "all" ? events.length : filterByFocus(events, tab.key).length;
            const active = tab.key === focus;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/dashboard/activity" : `/dashboard/activity?focus=${tab.key}`}
                aria-current={active ? "page" : undefined}
                className={`ed-chip ${active ? "ed-chip-on" : ""}`}
              >
                {tab.label}
                <span className={active ? "opacity-70" : "text-stone"}>{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty — nothing anywhere */}
      {events.length === 0 && (
        <div className="ed-panel">
          <div className="ed-empty">
            <p className="font-heading text-xl text-ink mb-2">No activity yet</p>
            <p className="max-w-sm mx-auto text-sm leading-relaxed">
              Share a surprise link and every open, RSVP and answer shows up
              here — your own previews never count.
            </p>
            <Link href="/dashboard" className="ed-btn ed-btn-line ed-btn-sm mt-6">
              Back to your surprises
            </Link>
          </div>
        </div>
      )}

      {/* Empty — this filter only */}
      {events.length > 0 && visible.length === 0 && (
        <div className="ed-panel">
          <div className="ed-empty">
            Nothing in this filter yet.{" "}
            <Link href="/dashboard/activity" className="ed-tlink">
              Show everything
            </Link>
          </div>
        </div>
      )}

      {/* Grouped feed — one panel per surprise, mockup `.panel` + `.feedi` */}
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <section key={group.invite.id} className="ed-panel">
            <h2>
              <Link
                href={`/surprise/${group.invite.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-coral-deep transition-colors focus:outline-none focus:underline"
              >
                {group.invite.title}
              </Link>
              <span className="label shrink-0 !text-[10px]">
                {group.events.length} {group.events.length === 1 ? "moment" : "moments"}
              </span>
            </h2>

            <ul>
              {group.events.map((event) => (
                <li key={event.id} className="ed-feedi">
                  <span className="ed-dot" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ink truncate">{describeActivity(event)}</p>
                    <time dateTime={event.at} className="ed-t block">
                      {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isCapped && visible.length > 0 && (
        <p className="mt-6 text-center text-xs text-stone">
          Showing your {ACTIVITY_FEED_CAP} most recent moments. Open a surprise&apos;s
          insights for its full history.
        </p>
      )}

      <div className="ed-appbar-gutter sm:hidden" aria-hidden="true" />
    </div>
  );
}
