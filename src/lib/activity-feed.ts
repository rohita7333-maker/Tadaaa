/**
 * activity-feed.ts — pure shaping logic for the dashboard Activity view.
 *
 * The server component owns the (creator-scoped) Supabase reads; everything
 * that decides WHAT the creator sees lives here so it can be unit-tested and
 * so the security rules (drop anything that can't be tied back to one of the
 * creator's own invites, never render an unbounded guest-supplied name) are
 * enforced in exactly one place.
 */

export type ActivityKind = "view" | "rsvp" | "answer";

export interface ActivityEvent {
  /** Stable key for React — table-prefixed row id. */
  readonly id: string;
  readonly kind: ActivityKind;
  readonly inviteId: string;
  /** ISO timestamp the event happened. */
  readonly at: string;
  /** Guest display name — only ever populated for named RSVPs. */
  readonly name: string | null;
  /** Question text — only ever populated for answers. */
  readonly question: string | null;
  /** Yes/no — only ever populated for answers. */
  readonly answer: boolean | null;
}

/** Newest-N cap for the whole feed. Keeps the page one screen of real data. */
export const ACTIVITY_FEED_CAP = 50;
/** Guest names are recipient-supplied; render at most this many characters. */
export const GUEST_NAME_MAX = 40;
/** Question text is creator-supplied but still capped so the feed stays scannable. */
export const QUESTION_MAX = 90;

/**
 * Normalize a recipient-supplied name for display: strip control characters,
 * collapse whitespace, trim, and hard-cap the length. Returns null for
 * anything that ends up empty so callers fall back to "Someone".
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
  return collapsed.length > max
    ? `${collapsed.slice(0, max).trimEnd()}…`
    : collapsed;
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
  /** Questions belonging to the creator's own invites — the answer→invite bridge. */
  questions: QuestionMeta[];
  /** Ids of the creator's own invites. Anything outside this set is dropped. */
  ownedInviteIds: readonly string[];
  cap?: number;
}

/**
 * Merge views + RSVPs + answers into one newest-first feed.
 *
 * Rows without a timestamp, or belonging to an invite the caller doesn't own,
 * are dropped rather than rendered — RLS already scopes the reads, this is the
 * belt-and-braces pass so a policy regression can't leak another creator's data
 * into the UI.
 */
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

/**
 * Group a feed by invite, keeping both the groups and the events inside them in
 * newest-first order. Invites the caller doesn't own (or that no longer exist)
 * are dropped.
 */
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

  // Map preserves insertion order, and `events` arrives newest-first, so the
  // groups already come out ordered by their most recent event.
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

/** Coerce an untrusted `?focus=` search param to a known value. */
export function parseFocus(raw: string | undefined): ActivityFocus {
  if (raw === "views" || raw === "rsvps" || raw === "answers") return raw;
  return "all";
}

export function filterByFocus(
  events: readonly ActivityEvent[],
  focus: ActivityFocus
): ActivityEvent[] {
  if (focus === "all") return [...events];
  const kind = FOCUS_KIND[focus];
  return events.filter((e) => e.kind === kind);
}

/**
 * Human copy for one event. Anonymous views stay anonymous on purpose — the
 * product promise is that guests never have to sign in.
 */
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
