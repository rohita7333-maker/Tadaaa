"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { type QuestionWithAnswers } from "@/lib/types";

export async function saveQuestions(
  inviteId: string,
  questions: { text: string; requireAnswer: boolean }[]
) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: invite } = await authClient
    .from("invites")
    .select("creator_id")
    .eq("id", inviteId)
    .single();
  if (!invite || invite.creator_id !== user.id) return { error: "Not found" };

  const supabase = await createServiceClient();

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
  // Verify creator owns this invite
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invite } = await supabase
    .from("invites")
    .select("id, creator_id")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.creator_id !== user.id) return null;

  // Fetch questions with their answers
  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
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
