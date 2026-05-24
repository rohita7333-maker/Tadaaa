import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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

  const rawUa = request.headers.get("user-agent") ?? "";

  // record_answer has SECURITY DEFINER + GRANT to anon — validates invite, verifies
  // question ownership, inserts answer, and returns creator_id+title for the notification.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_answer", {
    p_question_id: questionId,
    p_invite_id: inviteId,
    p_answer: answer,
    p_user_agent: rawUa,
  });

  if (error) {
    console.error("Failed to insert answer:", error);
    return NextResponse.json({ error: "Failed to record answer" }, { status: 500 });
  }

  if (!data?.ok) {
    if (data?.code === "invalid_question") {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invite unavailable" }, { status: 410 });
  }

  // Send answer notification email (fire and forget).
  // auth.admin.getUserById requires service-role — isolated to this block.
  if (data.creator_id) {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("notify_on_answer")
      .eq("id", data.creator_id)
      .maybeSingle();

    if (!profile) {
      await admin.from("profiles").upsert({
        id: data.creator_id,
        notify_on_view: true,
        notify_on_answer: true,
        notify_occasions: true,
      });
    }

    const wantsNotify = profile?.notify_on_answer ?? true;
    if (wantsNotify) {
      const { data: authUser } = await admin.auth.admin.getUserById(data.creator_id);
      if (authUser?.user?.email) {
        const { data: q } = await admin
          .from("invite_questions")
          .select("question_text")
          .eq("id", questionId)
          .single();
        const name = (authUser.user.user_metadata?.full_name as string) || "there";
        const dashUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app"}/dashboard`;
        const email = inviteAnsweredEmail(name, data.title, q?.question_text || "", answer, dashUrl);
        sendEmail(authUser.user.email, email.subject, email.html).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}
