/**
 * Supabase data layer. Everything here runs directly against the shared DB
 * under RLS — no backend required. (Photo binary upload + signed display are
 * the only pieces that need the Next backend; those live in api.ts / the
 * mobile BFF, because the invite-photos bucket is private by design.)
 *
 * RLS recap (verified against the live project via pg_policy, 2026-08-14):
 *   invites          INSERT/UPDATE/DELETE  auth.uid() = creator_id ; SELECT own
 *   invite_photos    INSERT/DELETE         creator owns invite    ; SELECT own
 *   invite_questions ALL                   creator owns invite    ; SELECT own
 *   invite_contributions                                          ; SELECT own
 *   invite_rsvps     SELECT                owner ; writes via record_rsvp RPC
 *   invite_answers   SELECT owner ; INSERT public (also record_answer RPC)
 *   invite_views     INSERT public ; SELECT owner ; increment_view_count RPC
 *   profiles         SELECT/UPDATE own
 *
 * The first four read "SELECT own" because RESTRICTIVE policies scoped
 * `to anon, authenticated` narrow them to `creator_id = auth.uid()`
 * (sql/invite_read_lockdown.sql). This comment previously said "SELECT public"
 * for invites and invite_photos, and it was accurate: the permissive policies
 * were granted to PUBLIC with the expression `true`, so any visitor holding the
 * anon key could enumerate every creator's invites, private message bodies and
 * photo paths. Guests now reach a single invite through the SECURITY DEFINER
 * readers only — see getInviteForReveal below.
 */
import { supabase } from "./supabase";
import type { Tables, TablesInsert } from "./database.types";
import { generateSlug } from "./slug";
import { visitorHash, userAgent } from "./device";
import { eventsSchema, type StoryEventInput } from "./schemas";
import type {
  EditableInvite,
  EditableQuestion,
  InviteUpdatePatch,
  QuestionPlan,
} from "./invite-edit";
import { classifyReveal, type RevealUnavailableReason } from "./reveal-unavailable";
import { parseRevealBundle, type RevealBundleResult } from "./reveal-bundle";
import {
  ACTIVITY_FEED_CAP,
  type InviteMeta,
  type QuestionMeta,
  type RawAnswerRow,
  type RawRsvpRow,
  type RawViewRow,
} from "./activity-feed";

export type Invite = Tables<"invites">;
export type InvitePhoto = Tables<"invite_photos">;
export type InviteQuestion = Tables<"invite_questions">;
export type InviteContribution = Tables<"invite_contributions">;
export type Profile = Tables<"profiles">;

// ---------------------------------------------------------------------------
// Auth / profile
// ---------------------------------------------------------------------------
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function updateNotifyPrefs(
  userId: string,
  prefs: Partial<
    Pick<Profile, "notify_on_view" | "notify_on_answer" | "notify_occasions">
  >
): Promise<void> {
  const { error } = await supabase.from("profiles").update(prefs).eq("id", userId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Dashboard / my invites
// ---------------------------------------------------------------------------
export async function getMyInvites(userId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("creator_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function monthlyInviteCount(userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId)
    .is("deleted_at", null)
    .gte("created_at", start.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export interface NewInviteInput {
  title: string;
  theme: string;
  message: string;
  occasionType: string;
  /** `letters` is live in the CHECK constraint and D5 renders it. */
  revealType: "tap" | "countdown" | "scroll_story" | "letters";
  countdownDate?: string | null;
  expiresAt?: string | null;
  /**
   * Scroll Story timeline plaques. Stored verbatim as camelCase JSON in the
   * invites.events jsonb column (same shape the web app writes). Omit or pass
   * [] for non-scroll_story reveals.
   */
  events?: StoryEventInput[];
  acceptContributions: boolean;
  enableDodgeNo: boolean;
  isPaid: boolean;
  /** C5: null means recipient-local, which is the recommended default. */
  displayTimezone?: string | null;
  /** C1 wizard pre-generates the slug so C3 can show the contribution link
   *  before the row exists. Collisions still fall back to a fresh slug. */
  slug?: string;
}

/** Insert the invite row (owner-scoped). Returns the new id + unique slug. */
export async function createInviteRow(input: NewInviteInput): Promise<{
  id: string;
  slug: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to create a surprise.");

  // Defense-in-depth: mobile writes straight to the DB under RLS with no server
  // revalidation, so the events payload is validated here too (not just at the
  // publish gate). Scroll Story keeps its plaques; every other reveal stores [].
  let events: StoryEventInput[] = [];
  if (input.revealType === "scroll_story" && input.events && input.events.length > 0) {
    const parsed = eventsSchema.safeParse(input.events);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid scroll story plan.");
    }
    events = parsed.data;
  }

  // Retry on the rare slug collision (UNIQUE constraint).
  for (let attempt = 0; attempt < 5; attempt++) {
    // Honour a caller-supplied slug on the FIRST attempt only: if it collided,
    // reusing it would collide every time.
    const slug = attempt === 0 && input.slug ? input.slug : generateSlug();
    const row: TablesInsert<"invites"> = {
      creator_id: userId,
      slug,
      title: input.title,
      theme: input.theme,
      message: input.message,
      occasion_type: input.occasionType,
      reveal_type: input.revealType,
      countdown_date:
        input.revealType === "countdown" || input.revealType === "scroll_story"
          ? input.countdownDate ?? null
          : null,
      expires_at: input.expiresAt ?? null,
      display_timezone: input.displayTimezone ?? null,
      accept_contributions: input.acceptContributions,
      enable_dodge_no: input.enableDodgeNo,
      is_paid: input.isPaid,
      is_active: true,
      events,
    };
    const { data, error } = await supabase
      .from("invites")
      .insert(row)
      .select("id, slug")
      .single();
    if (!error && data) return { id: data.id, slug: data.slug };
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
  }
  throw new Error("Could not generate a unique link — please try again.");
}

export interface NewQuestion {
  text: string;
  yesLabel: string;
  noLabel: string;
  requireAnswer: boolean;
  attachedPhotoIndex: number | null;
}

export async function addQuestions(
  inviteId: string,
  questions: NewQuestion[]
): Promise<void> {
  if (questions.length === 0) return;
  const rows: TablesInsert<"invite_questions">[] = questions.map((q, i) => ({
    invite_id: inviteId,
    question_text: q.text,
    yes_label: q.yesLabel || "Yes",
    no_label: q.noLabel || "No",
    require_answer: q.requireAnswer,
    attached_photo_index: q.attachedPhotoIndex,
    sort_order: i,
  }));
  const { error } = await supabase.from("invite_questions").insert(rows);
  if (error) throw new Error(error.message);
}

/** Insert invite_photos rows after the binaries are uploaded via the backend. */
export async function addPhotoRows(
  inviteId: string,
  photos: { storagePath: string; caption: string; rotationDeg: number }[]
): Promise<void> {
  if (photos.length === 0) return;
  const rows: TablesInsert<"invite_photos">[] = photos.map((p, i) => ({
    invite_id: inviteId,
    storage_path: p.storagePath,
    caption: p.caption,
    rotation_deg: p.rotationDeg,
    sort_order: i,
  }));
  const { error } = await supabase.from("invite_photos").insert(rows);
  if (error) throw new Error(error.message);
}

/**
 * Read one of the signed-in creator's own invites, for editing.
 *
 * RLS does the authorisation: `invites_select_restrict` is RESTRICTIVE and
 * scoped `creator_id = auth.uid()`, so another user's id returns zero rows
 * rather than someone else's surprise. The `.eq("id", …)` is a lookup, not a
 * permission check.
 */
export async function getInviteForEdit(
  inviteId: string
): Promise<{ invite: EditableInvite; questions: EditableQuestion[] } | null> {
  const { data, error } = await supabase
    .from("invites")
    .select(
      "id, slug, title, message, theme, occasion_type, reveal_type, countdown_date, display_timezone, accept_contributions, enable_dodge_no, pin_hash, pin_hint"
    )
    .eq("id", inviteId)
    .maybeSingle();
  if (error || !data) return null;

  const { data: qs } = await supabase
    .from("invite_questions")
    .select("id, question_text, sort_order")
    .eq("invite_id", inviteId)
    .order("sort_order", { ascending: true });

  return { invite: data as EditableInvite, questions: (qs ?? []) as EditableQuestion[] };
}

/**
 * Apply an edit. Updates the wizard-owned columns and nothing else.
 *
 * `invites` carries a permissive UPDATE policy `(auth.uid() = creator_id)` with
 * no separate WITH CHECK, so Postgres applies USING to the new row too — the
 * creator cannot be reassigned, and another user's row matches zero rows.
 */
export async function updateInviteRow(
  inviteId: string,
  patch: InviteUpdatePatch
): Promise<void> {
  const { error } = await supabase.from("invites").update(patch).eq("id", inviteId);
  if (error) throw new Error(error.message);
}

/**
 * Reconcile C3's single question field against the rows that exist.
 *
 * The first question is rewritten IN PLACE rather than replaced: answers are
 * keyed to the question id and would cascade away with a delete.
 */
export async function applyQuestionPlan(
  inviteId: string,
  plan: QuestionPlan,
  /** The text the creator typed. Needed for the in-place rewrite. */
  text: string
): Promise<void> {
  if (plan.deleteIds.length > 0) {
    const { error } = await supabase
      .from("invite_questions")
      .delete()
      .in("id", plan.deleteIds);
    if (error) throw new Error(error.message);
  }
  if (plan.updateId) {
    const { error } = await supabase
      .from("invite_questions")
      .update({ question_text: text.trim() })
      .eq("id", plan.updateId);
    if (error) throw new Error(error.message);
  }
  if (plan.insert) {
    await addQuestions(inviteId, [
      {
        text: plan.insert,
        yesLabel: "Yes",
        noLabel: "No",
        requireAnswer: false,
        attachedPhotoIndex: null,
      },
    ]);
  }
}

export async function softDeleteInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("invites")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
}

export async function setInviteActive(
  inviteId: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase
    .from("invites")
    .update({ is_active: active })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Reveal (public) — read through SECURITY DEFINER readers, NOT the tables
// ---------------------------------------------------------------------------
/**
 * `invites`, `invite_questions`, `invite_photos` and `invite_contributions` all
 * carry permissive SELECT policies granted to PUBLIC. RESTRICTIVE policies
 * scoped `to anon, authenticated` (sql/invite_read_lockdown.sql) narrow those to
 * `creator_id = auth.uid()`, which is zero rows for a guest opening a link.
 *
 * A guest therefore cannot read these tables at all, by design — secrecy-by-URL
 * is the whole security model of a surprise. The reveal goes through the
 * SECURITY DEFINER readers instead, each of which can only ever return one
 * invite's worth of rows.
 *
 * Web needs no equivalent change: its reveal path already runs on the
 * service-role client, which holds BYPASSRLS.
 */

/**
 * The readers return a deliberate subset of `invites` — no creator_id, no
 * stripe_session_id, no video_job_id. This type says so honestly rather than
 * casting to the full row and hoping nothing downstream reaches for a column
 * that is not there.
 */
export type RevealInvite = Pick<
  Invite,
  | "id"
  | "slug"
  | "title"
  | "message"
  | "theme"
  | "occasion_type"
  | "reveal_type"
  | "countdown_date"
  | "expires_at"
  | "events"
  | "enable_dodge_no"
  | "accept_contributions"
  | "is_paid"
  | "view_count"
  | "response_count"
  | "created_at"
>;

export interface RevealData {
  invite: RevealInvite;
  questions: InviteQuestion[];
  photos: InvitePhoto[];
  contributions: InviteContribution[];
}

/**
 * The readers do not exist in the live database yet, so `database.types.ts`
 * cannot describe them and `supabase.rpc()` rejects the names at compile time.
 * This is the single place that gap is bridged.
 *
 * REPLACE THIS with regenerated types once sql/invite_read_lockdown.sql has
 * been applied — at that point the cast becomes dead weight hiding real type
 * errors.
 */
async function revealRpc<T>(name: string, args: Record<string, unknown>): Promise<T[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: T[] | null; error: unknown }>;
  const { data } = await rpc(name, args);
  return data ?? [];
}

export async function getInviteForReveal(slug: string): Promise<RevealData | null> {
  // The reader already filters deleted / inactive / expired, so an empty result
  // IS the "unavailable" signal. getRevealUnavailableReason then says which.
  const rows = await revealRpc<RevealInvite>("get_invite_by_slug", { p_slug: slug });
  const invite = rows[0];
  if (!invite) return null;

  const [questions, photos, contributions] = await Promise.all([
    revealRpc<InviteQuestion>("get_invite_questions", { p_invite_id: invite.id }),
    revealRpc<InvitePhoto>("get_invite_photos", { p_invite_id: invite.id }),
    invite.accept_contributions
      ? revealRpc<InviteContribution>("get_invite_contributions", {
          p_invite_id: invite.id,
        })
      : Promise.resolve([] as InviteContribution[]),
  ]);

  return { invite, questions, photos, contributions };
}

/**
 * The PIN-gated path. `get_invite_by_slug` and its child readers now WITHHOLD a
 * PIN-locked invite entirely, so this is the ONLY way to read one — and it
 * verifies the PIN server-side before returning a single field.
 *
 * Returns letters alongside the rest: one round trip means a locked reveal
 * cannot half-load, and D5 does not need a second gated call.
 */
export async function getRevealBundle(
  slug: string,
  pin: string | null
): Promise<RevealBundleResult> {
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
  const { data, error } = await call("get_invite_reveal", { p_slug: slug, p_pin: pin });
  if (error) return { ok: false, code: "unavailable" };
  return parseRevealBundle(data);
}

/**
 * Why a reveal could not be shown. Runs ONLY on the failure path — the happy
 * path never calls it and pays nothing.
 *
 * Reads `get_invite_state`, not the table. The RESTRICTIVE SELECT policy on
 * `invites` narrows a guest to zero rows, so a direct read here would classify
 * every unavailable reveal as "missing" — reintroducing the single wrong
 * "this surprise has closed" message that `classifyReveal` exists to fix.
 *
 * The reader returns liveness ONLY: no title, no message, nothing an enumerator
 * could harvest by walking slugs.
 */
export async function getRevealUnavailableReason(
  slug: string
): Promise<RevealUnavailableReason> {
  const rows = await revealRpc<{
    found: boolean;
    is_active: boolean | null;
    expires_at: string | null;
  }>("get_invite_state", { p_slug: slug });

  return classifyReveal(rows[0] ?? null);
}

// ---------------------------------------------------------------------------
// Recipient actions — SECURITY DEFINER RPCs granted to anon
// ---------------------------------------------------------------------------
/**
 * One recipient open.
 *
 * `log_invite_open`, not `increment_view_count`. The old call bumped
 * `invites.view_count` and wrote NO `invite_views` row, so frame B5's 7-day
 * chart — which reads that table — was permanently empty for anything opened
 * from the phone, and B2 could show 42 views next to a B5 chart showing none.
 * It also counted the creator's own preview, which web has always skipped and
 * which frame B4 already promises is skipped. Both are handled server-side now,
 * so every client gets the same rule.
 *
 * Web keeps calling `increment_view_count` plus its own admin insert; that pair
 * is untouched, because adding the insert to the shared function would make web
 * log every view twice.
 */
export async function recordView(inviteId: string): Promise<number | null> {
  const { data } = await supabase.rpc("log_invite_open", {
    p_invite_id: inviteId,
    p_user_agent: userAgent(),
  });
  return typeof data === "number" ? data : null;
}

export async function recordRsvp(
  inviteId: string,
  name?: string
): Promise<void> {
  const { error } = await supabase.rpc("record_rsvp", {
    p_invite_id: inviteId,
    p_visitor_hash: await visitorHash(),
    p_user_agent: userAgent(),
    p_name: name ?? undefined,
  });
  if (error) throw new Error(error.message);
}

export async function recordAnswer(
  inviteId: string,
  questionId: string,
  answer: boolean
): Promise<void> {
  const { error } = await supabase.rpc("record_answer", {
    p_invite_id: inviteId,
    p_question_id: questionId,
    p_answer: answer,
    p_user_agent: userAgent(),
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Dashboard aggregates (owner-only reads)
// ---------------------------------------------------------------------------
export async function getRsvps(inviteId: string): Promise<Tables<"invite_rsvps">[]> {
  const { data } = await supabase
    .from("invite_rsvps")
    .select("*")
    .eq("invite_id", inviteId)
    .order("responded_at", { ascending: false });
  return data ?? [];
}

export interface ActivityRows {
  invites: InviteMeta[];
  views: RawViewRow[];
  rsvps: RawRsvpRow[];
  answers: RawAnswerRow[];
  questions: QuestionMeta[];
}

/**
 * Everything the Activity feed needs, in creator-scoped reads.
 *
 * The invite list is fetched by `creator_id` and every child query is
 * constrained to those ids; the owner-read RLS policies on invite_views /
 * invite_rsvps / invite_answers are the second lock. Answers only reach an
 * invite through their question, so questions are fetched first and used as
 * the bridge (and as the ownership filter) in `buildActivityFeed`.
 */
export async function getActivityRows(userId: string): Promise<ActivityRows> {
  const { data: inviteRows } = await supabase
    .from("invites")
    .select("id, title, slug")
    .eq("creator_id", userId)
    .is("deleted_at", null);

  const invites: InviteMeta[] = (inviteRows ?? []).map((inv) => ({
    id: inv.id,
    title: inv.title ?? "Untitled surprise",
    slug: inv.slug,
  }));
  const inviteIds = invites.map((inv) => inv.id);

  if (inviteIds.length === 0) {
    return { invites, views: [], rsvps: [], answers: [], questions: [] };
  }

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

  const questions: QuestionMeta[] = (questionsRes.data ?? []).map((q) => ({
    id: q.id,
    invite_id: q.invite_id,
    question_text: q.question_text ?? "",
  }));

  const questionIds = questions.map((q) => q.id);
  const answersRes = questionIds.length
    ? await supabase
        .from("invite_answers")
        .select("id, question_id, answer, answered_at")
        .in("question_id", questionIds)
        .order("answered_at", { ascending: false })
        .limit(ACTIVITY_FEED_CAP)
    : { data: [] as RawAnswerRow[] };

  return {
    invites,
    views: viewsRes.data ?? [],
    rsvps: rsvpsRes.data ?? [],
    answers: answersRes.data ?? [],
    questions,
  };
}

export async function getContributions(
  inviteId: string
): Promise<InviteContribution[]> {
  const { data } = await supabase
    .from("invite_contributions")
    .select("*")
    .eq("invite_id", inviteId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ---------------------------------------------------------------------------
// B2 — surprise detail actions
// ---------------------------------------------------------------------------

/** Untyped RPC bridge for functions added after `database.types.ts` was generated. */
async function detailRpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: T | null; error: unknown }>;
  const { data } = await call(name, args);
  return data ?? null;
}

/**
 * Total reactions across all emoji, for B2's third stat tile.
 *
 * Reads `get_reaction_counts` (SECURITY DEFINER, slug-scoped) rather than
 * `invite_reactions` directly: that table has no owner SELECT policy, so a
 * direct count would silently return 0 for every surprise.
 */
export async function getReactionTotal(slug: string): Promise<number> {
  const rows = await detailRpc<{ emoji: string; count: number }[]>("get_reaction_counts", {
    p_slug: slug,
  });
  return (rows ?? []).reduce((sum, r) => sum + Number(r.count ?? 0), 0);
}

/**
 * Set or clear the PIN. Hashing happens server-side inside `set_invite_pin` —
 * a client that computes the hash has made the hash the credential.
 * Pass `null` to clear.
 */
export async function setInvitePin(
  inviteId: string,
  pin: string | null,
  hint: string | null
): Promise<{ ok: boolean; code?: string }> {
  const res = await detailRpc<{ ok?: boolean; code?: string }>("set_invite_pin", {
    p_invite_id: inviteId,
    p_pin: pin ?? "",
    p_hint: hint,
  });
  return { ok: res?.ok === true, code: res?.code };
}

export async function setInviteContributions(
  inviteId: string,
  accepting: boolean
): Promise<void> {
  const { error } = await supabase
    .from("invites")
    .update({ accept_contributions: accepting })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
}

/**
 * `···` → Extend link. Pushes `expires_at` out from NOW, not from the current
 * expiry: extending an already-dead link by 30 days from its old expiry can
 * still leave it dead, which reads as the button doing nothing.
 * Returns the new date, already formatted for the confirmation.
 */
export async function extendInviteLink(inviteId: string, days: number): Promise<string> {
  const until = new Date(Date.now() + days * 86_400_000);
  const { error } = await supabase
    .from("invites")
    .update({ expires_at: until.toISOString(), is_active: true })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
  return until.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * `···` → Duplicate. Copies the content and settings, never the audience:
 * views, RSVPs, answers, reactions and contributions all stay with the
 * original, and the copy starts inactive so it cannot go live by accident
 * before its owner has looked at it.
 */
export async function duplicateInvite(inviteId: string): Promise<{ id: string; slug: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in.");

  const { data: source, error: readErr } = await supabase
    .from("invites")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!source) throw new Error("That surprise is gone.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const row: TablesInsert<"invites"> = {
      creator_id: userId,
      slug: generateSlug(),
      title: `${source.title} (copy)`,
      theme: source.theme,
      message: source.message,
      occasion_type: source.occasion_type,
      reveal_type: source.reveal_type,
      countdown_date: source.countdown_date,
      display_timezone: source.display_timezone,
      accept_contributions: source.accept_contributions,
      enable_dodge_no: source.enable_dodge_no,
      events: source.events,
      is_paid: false,
      is_active: false,
    };
    const { data, error } = await supabase
      .from("invites")
      .insert(row)
      .select("id, slug")
      .single();
    if (!error && data) {
      const { data: questions } = await supabase
        .from("invite_questions")
        .select("question_text, yes_label, no_label, require_answer, attached_photo_index, sort_order")
        .eq("invite_id", inviteId);
      if (questions && questions.length > 0) {
        await supabase
          .from("invite_questions")
          .insert(questions.map((q) => ({ ...q, invite_id: data.id })));
      }
      return { id: data.id, slug: data.slug };
    }
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error("Could not generate a unique link — please try again.");
}
