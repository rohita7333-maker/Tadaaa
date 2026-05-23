import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { monthlyReengagementEmail } from "@/lib/email/templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { safeBearerCheck } from "@/lib/cron-auth";

const BATCH_SIZE = 25;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (!safeBearerCheck(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, notify_occasions")
    .eq("notify_occasions", true);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app";
  let sent = 0;
  let failed = 0;

  async function processOne(profileId: string) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
    if (!authUser?.user?.email) return false;

    const [invitesRes, viewsRes, answersRes] = await Promise.all([
      supabase
        .from("invites")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", profileId),
      supabase
        .from("invite_views")
        .select("*, invites!inner(creator_id)", { count: "exact", head: true })
        .eq("invites.creator_id", profileId),
      supabase
        .from("invite_answers")
        .select("*, invites!inner(creator_id)", { count: "exact", head: true })
        .eq("invites.creator_id", profileId),
    ]);

    const name = (authUser.user.user_metadata?.full_name as string) || "there";
    const email = monthlyReengagementEmail(
      name,
      {
        totalInvites: invitesRes.count ?? 0,
        totalViews: viewsRes.count ?? 0,
        totalAnswers: answersRes.count ?? 0,
      },
      `${baseUrl}/create`,
      unsubscribeUrl(baseUrl, profileId, "monthly")
    );

    await sendEmail(authUser.user.email, email.subject, email.html);
    return true;
  }

  // Chunk + parallel within each chunk. Bounds Resend concurrency to BATCH_SIZE.
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const chunk = profiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(chunk.map((p) => processOne(p.id)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else if (r.status === "rejected") {
        failed++;
        console.error("[cron monthly] send failed:", r.reason);
      }
    }
  }

  return NextResponse.json({ sent, failed, total: profiles.length });
}
