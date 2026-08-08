/**
 * activity-feed.ts — pure shaping logic for the Activity tab.
 *
 * 1:1 port of the web app's `src/lib/activity-feed.ts` so both surfaces read the
 * same story from the same rows. db.ts owns the (creator-scoped) reads; this
 * module decides what is shown, and enforces the two rules that matter:
 * nothing outside the creator's own invites is ever rendered, and recipient-
 * supplied names are sanitized + length-capped before display.
 */

export type ActivityKind = "view" | "rsvp" | "answer";

export interface ActivityEvent {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly inviteId: string;
  /** ISO timestamp the event happened. */
  readonly at: string;
  readonly name: string | null;
  readonly question: string | null;
  readonly answer: boolean | null;
}

export const ACTIVITY_FEED_CAP = 50;
export const GUEST_NAME_MAX = 40;
export const QUESTION_MAX = 90;

/**
 * Normalize a recipient-supplied name for display: strip control characters,
 * collapse whitespace, trim, hard-cap the length. Null when nothing is left.
 */
export function sanitizeGuestName(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  // Deliberate: strip C0/C1 control characters before display.
  const stripped = raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > GUEST_NAME_MAX
    ? `${collapsed.slice(0, GUEST_NAME_MAX).trimEnd()}…`
    : collapsed;
}

function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max).trimEnd()}…` : collapsed;
}

export interface RawViewRow {
  id: string;
  invite_id: string | null;
  viewed_at: string | null;
}

export interface RawRsvpRow {
  id: string;
  invite_id: string | null;
  responded_at: string | null;
  name: string | null;
}

export interface RawAnswerRow {
  id: string;
  question_id: string | null;
  answer: boolean | null;
  answered_at: string | null;
}

export interface QuestionMeta {
  id: string;
  invite_id: string;
  question_text: string;
}

export interface BuildActivityFeedInput {
  views: RawViewRow[];
  rsvps: RawRsvpRow[];
  answers: RawAnswerRow[];
  questions: QuestionMeta[];
  ownedInviteIds: readonly string[];
  cap?: number;
}

/** Merge views + RSVPs + answers into one newest-first, creator-scoped feed. */
export function buildActivityFeed({
  views,
  rsvps,
  answers,
  questions,
  ownedInviteIds,
  cap = ACTIVITY_FEED_CAP,
}: BuildActivityFeedInput): ActivityEvent[] {
  const owned = new Set(ownedInviteIds);
  const questionById = new Map(
    questions.filter((q) => owned.has(q.invite_id)).map((q) => [q.id, q])
  );

  const events: ActivityEvent[] = [];

  for (const row of views) {
    if (!row.viewed_at || !row.invite_id || !owned.has(row.invite_id)) continue;
    events.push({
      id: `view:${row.id}`,
      kind: "view",
      inviteId: row.invite_id,
      at: row.viewed_at,
      name: null,
      question: null,
      answer: null,
    });
  }

  for (const row of rsvps) {
    if (!row.responded_at || !row.invite_id || !owned.has(row.invite_id)) continue;
    events.push({
      id: `rsvp:${row.id}`,
      kind: "rsvp",
      inviteId: row.invite_id,
      at: row.responded_at,
      name: sanitizeGuestName(row.name),
      question: null,
      answer: null,
    });
  }

  for (const row of answers) {
    if (!row.answered_at || !row.question_id) continue;
    const question = questionById.get(row.question_id);
    if (!question) continue;
    events.push({
      id: `answer:${row.id}`,
      kind: "answer",
      inviteId: question.invite_id,
      at: row.answered_at,
      name: null,
      question: truncate(question.question_text, QUESTION_MAX),
      answer: typeof row.answer === "boolean" ? row.answer : null,
    });
  }

  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return events.slice(0, Math.max(0, cap));
}

export interface InviteMeta {
  id: string;
  title: string;
  slug: string;
}

export interface ActivityGroup {
  readonly invite: InviteMeta;
  readonly events: ActivityEvent[];
}

/** Group a feed per invite, groups ordered by their most recent event. */
export function groupByInvite(
  events: readonly ActivityEvent[],
  invites: readonly InviteMeta[]
): ActivityGroup[] {
  const inviteById = new Map(invites.map((inv) => [inv.id, inv]));
  const groups = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    if (!inviteById.has(event.inviteId)) continue;
    const bucket = groups.get(event.inviteId);
    if (bucket) bucket.push(event);
    else groups.set(event.inviteId, [event]);
  }

  return Array.from(groups, ([inviteId, list]) => ({
    invite: inviteById.get(inviteId)!,
    events: list,
  }));
}

export type ActivityFocus = "all" | "views" | "rsvps" | "answers";

const FOCUS_KIND: Record<Exclude<ActivityFocus, "all">, ActivityKind> = {
  views: "view",
  rsvps: "rsvp",
  answers: "answer",
};

export function filterByFocus(
  events: readonly ActivityEvent[],
  focus: ActivityFocus
): ActivityEvent[] {
  if (focus === "all") return [...events];
  const kind = FOCUS_KIND[focus];
  return events.filter((e) => e.kind === kind);
}

/** Human copy for one event. Views stay anonymous on purpose. */
export function describeActivity(event: ActivityEvent): string {
  switch (event.kind) {
    case "view":
      return "Someone peeked";
    case "rsvp":
      return event.name ? `${event.name} is in` : "Someone said they're in";
    case "answer": {
      const verdict = event.answer === true ? "Yes" : event.answer === false ? "No" : "—";
      return event.question ? `${verdict} — “${event.question}”` : verdict;
    }
  }
}
