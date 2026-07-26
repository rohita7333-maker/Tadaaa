/**
 * Supabase data layer. Everything here runs directly against the shared DB
 * under RLS — no backend required. (Photo binary upload + signed display are
 * the only pieces that need the Next backend; those live in api.ts / the
 * mobile BFF, because the invite-photos bucket is private by design.)
 *
 * RLS recap (verified against the live project):
 *   invites          INSERT/UPDATE/DELETE  auth.uid() = creator_id ; SELECT public
 *   invite_photos    INSERT/DELETE         creator owns invite    ; SELECT public
 *   invite_questions ALL                   creator owns invite    ; SELECT active
 *   invite_rsvps     SELECT                owner ; writes via record_rsvp RPC
 *   invite_answers   SELECT owner ; INSERT public (also record_answer RPC)
 *   invite_views     INSERT public ; SELECT owner ; increment_view_count RPC
 *   profiles         SELECT/UPDATE own
 */
import { supabase } from "./supabase";
import type { Tables, TablesInsert } from "./database.types";
import { generateSlug } from "./slug";
import { visitorHash, userAgent } from "./device";

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
  revealType: "tap" | "countdown";
  countdownDate?: string | null;
  expiresAt?: string | null;
  acceptContributions: boolean;
  enableDodgeNo: boolean;
  isPaid: boolean;
}

/** Insert the invite row (owner-scoped). Returns the new id + unique slug. */
export async function createInviteRow(input: NewInviteInput): Promise<{
  id: string;
  slug: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to create a surprise.");

  // Retry on the rare slug collision (UNIQUE constraint).
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    const row: TablesInsert<"invites"> = {
      creator_id: userId,
      slug,
      title: input.title,
      theme: input.theme,
      message: input.message,
      occasion_type: input.occasionType,
      reveal_type: input.revealType,
      countdown_date: input.revealType === "countdown" ? input.countdownDate ?? null : null,
      expires_at: input.expiresAt ?? null,
      accept_contributions: input.acceptContributions,
      enable_dodge_no: input.enableDodgeNo,
      is_paid: input.isPaid,
      is_active: true,
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
// Reveal (public) — invite + questions read directly; photos signed via backend
// ---------------------------------------------------------------------------
export interface RevealData {
  invite: Invite;
  questions: InviteQuestion[];
  photos: InvitePhoto[];
  contributions: InviteContribution[];
}

export async function getInviteForReveal(slug: string): Promise<RevealData | null> {
  const { data: invite } = await supabase
    .from("invites")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invite || !invite.is_active) return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;

  const [{ data: questions }, { data: photos }, { data: contributions }] =
    await Promise.all([
      supabase
        .from("invite_questions")
        .select("*")
        .eq("invite_id", invite.id)
        .order("sort_order"),
      supabase
        .from("invite_photos")
        .select("*")
        .eq("invite_id", invite.id)
        .order("sort_order"),
      invite.accept_contributions
        ? supabase
            .from("invite_contributions")
            .select("*")
            .eq("invite_id", invite.id)
            .eq("approved", true)
            .order("created_at")
        : Promise.resolve({ data: [] as InviteContribution[] }),
    ]);

  return {
    invite,
    questions: questions ?? [],
    photos: photos ?? [],
    contributions: contributions ?? [],
  };
}

// ---------------------------------------------------------------------------
// Recipient actions — SECURITY DEFINER RPCs granted to anon
// ---------------------------------------------------------------------------
export async function recordView(inviteId: string): Promise<number | null> {
  const { data } = await supabase.rpc("increment_view_count", {
    invite_id: inviteId,
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
