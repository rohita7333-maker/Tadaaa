import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { inviteAnsweredEmail } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  const ip = getIp(request.headers);
  if (!(await rateLimit(`answer:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json() as {
    questionId: string;
    answer: boolean;
    inviteId: string;
  };

  const { questionId, answer, inviteId } = body;

  if (!questionId || typeof answer !== "boolean" || !inviteId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verify invite is still active and not expired
  const { data: inviteRow } = await supabase
    .from("invites")
    .select("id, is_active, expires_at, status")
    .eq("id", inviteId)
    .single();

  const isExpired =
    inviteRow?.expires_at && new Date(inviteRow.expires_at) < new Date();

  if (
    !inviteRow ||
    !inviteRow.is_active ||
    inviteRow.status === "expired" ||
    isExpired
  ) {
    return NextResponse.json({ error: "Invite unavailable" }, { status: 410 });
  }

  // Verify question belongs to invite
  const { data: question } = await supabase
    .from("invite_questions")
    .select("id")
    .eq("id", questionId)
    .eq("invite_id", inviteId)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  const rawUa = request.headers.get("user-agent") ?? "";
  const { error } = await supabase.from("invite_answers").insert({
    question_id: questionId,
    invite_id: inviteId,
    answer,
    answered_at: new Date().toISOString(),
    user_agent: rawUa.slice(0, 255),
  });

  if (error) {
    console.error("Failed to insert answer:", error);
    return NextResponse.json({ error: "Failed to record answer" }, { status: 500 });
  }

  // Send answer notification email (fire and forget)
  const { data: invite } = await supabase
    .from("invites")
    .select("creator_id, title")
    .eq("id", inviteId)
    .single();

  if (invite) {
    // Default-on with auto-upsert so missing profile rows still receive emails.
    const { data: profile } = await supabase
      .from("profiles")
      .select("notify_on_answer")
      .eq("id", invite.creator_id)
      .maybeSingle();

    if (!profile) {
      await supabase.from("profiles").upsert({
        id: invite.creator_id,
        notify_on_view: true,
        notify_on_answer: true,
        notify_occasions: true,
      });
    }

    const wantsNotify = profile?.notify_on_answer ?? true;
    if (wantsNotify) {
      const { data: authUser } = await supabase.auth.admin.getUserById(invite.creator_id);
      if (authUser?.user?.email) {
        const { data: q } = await supabase
          .from("invite_questions")
          .select("question_text")
          .eq("id", questionId)
          .single();
        const name = (authUser.user.user_metadata?.full_name as string) || "there";
        const dashUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app"}/dashboard`;
        const email = inviteAnsweredEmail(name, invite.title, q?.question_text || "", answer, dashUrl);
        sendEmail(authUser.user.email, email.subject, email.html).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}
