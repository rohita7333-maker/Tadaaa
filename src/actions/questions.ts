"use server";

import { createClient } from "@/lib/supabase/server";
import { type QuestionWithAnswers } from "@/lib/types";

export async function saveQuestions(
  inviteId: string,
  questions: { text: string; requireAnswer: boolean }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Explicit ownership check so callers get a clear error (not silent RLS no-op)
  // when inviteId is wrong or belongs to another user.
  const { data: invite } = await supabase
    .from("invites")
    .select("creator_id")
    .eq("id", inviteId)
    .single();
  if (!invite || invite.creator_id !== user.id) return { error: "Not found" };

  await supabase.from("invite_questions").delete().eq("invite_id", inviteId);

  if (questions.length === 0) return { ok: true };

  const records = questions.map((q, i) => ({
    invite_id: inviteId,
    question_text: q.text,
    require_answer: q.requireAnswer,
    sort_order: i,
    attached_photo_index: null,
  }));

  const { error } = await supabase.from("invite_questions").insert(records);

  if (error) {
    console.error("Failed to save questions:", error);
    return { error: "Failed to save questions" };
  }

  return { ok: true };
}

export async function getInviteResponses(
  inviteId: string
): Promise<QuestionWithAnswers[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS on invite_questions ("Creators can manage questions") and invite_answers
  // ("Creators can view answers to their invites") both scope to auth.uid() —
  // this query returns null/empty automatically if the caller doesn't own the invite.
  const { data, error } = await supabase
    .from("invite_questions")
    .select("*, invite_answers(id, question_id, answer, answered_at, user_agent)")
    .eq("invite_id", inviteId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch responses:", error);
    return null;
  }

  return (data as QuestionWithAnswers[]) ?? [];
}

export interface InviteInsights {
  rsvps: { responded_at: string; user_agent: string | null }[];
  viewCount: number;
  rsvpCount: number;
}

/**
 * Returns anonymized activity: RSVP timestamps + view counter for the invite
 * owner. RSVPs and views are stored without PII by design — visitor_hash
 * is one-way and not surfaced to the dashboard.
 */
export async function getInviteInsights(
  inviteId: string
): Promise<InviteInsights | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS "Anyone can view active invites" returns the row; view_count is included.
  const { data: invite } = await supabase
    .from("invites")
    .select("id, creator_id, view_count")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.creator_id !== user.id) return null;

  // RLS "owner-read" on invite_rsvps scopes to auth.uid() via invites join.
  const { data: rsvpRows } = await supabase
    .from("invite_rsvps")
    .select("responded_at, user_agent")
    .eq("invite_id", inviteId)
    .order("responded_at", { ascending: false })
    .limit(200);

  const rsvps = (rsvpRows ?? []).map((r) => ({
    responded_at: r.responded_at as string,
    user_agent: (r.user_agent as string | null) ?? null,
  }));

  return {
    rsvps,
    viewCount: invite.view_count ?? 0,
    rsvpCount: rsvps.length,
  };
}
