import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { weeklyDigestEmail } from "@/lib/email/templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { safeBearerCheck } from "@/lib/cron-auth";

const BATCH_SIZE = 25;

/** ISO string for 7 days ago (used as gte filter). */
function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

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
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app";
  const since = sevenDaysAgo();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  async function processOne(profileId: string): Promise<"sent" | "skipped" | "failed"> {
    // Fetch activity counts for the past 7 days in parallel.
    const [invitesRes, viewsRes, answersRes] = await Promise.all([
      supabase
        .from("invites")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", profileId)
        .gte("created_at", since),
      supabase
        .from("invite_views")
        .select("*, invites!inner(creator_id)", { count: "exact", head: true })
        .eq("invites.creator_id", profileId)
        .gte("viewed_at", since),
      supabase
        .from("invite_answers")
        .select("*, invites!inner(creator_id)", { count: "exact", head: true })
        .eq("invites.creator_id", profileId)
        .gte("answered_at", since),
    ]);

    if (invitesRes.error || viewsRes.error || answersRes.error) {
      console.error(
        "[weekly-digest] supabase error for user",
        profileId,
        invitesRes.error ?? viewsRes.error ?? answersRes.error
      );
      return "failed";
    }

    const inviteCount = invitesRes.count ?? 0;
    const viewCount = viewsRes.count ?? 0;
    const rsvpCount = answersRes.count ?? 0;

    // Skip users with zero activity — no point emailing them.
    if (inviteCount === 0 && viewCount === 0 && rsvpCount === 0) {
      return "skipped";
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
    if (!authUser?.user?.email) return "skipped";

    const name = (authUser.user.user_metadata?.full_name as string) || "there";
    const email = weeklyDigestEmail({
      name,
      inviteCount,
      viewCount,
      rsvpCount,
      unsubscribeUrl: unsubscribeUrl(baseUrl, profileId, "weekly"),
    });

    const result = await sendEmail(authUser.user.email, email.subject, email.html);
    return result.success !== false ? "sent" : "failed";
  }

  // Process in batches of BATCH_SIZE to bound Resend concurrency.
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const chunk = profiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(chunk.map((p) => processOne(p.id)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value === "sent") sent++;
        else if (r.value === "skipped") skipped++;
        else failed++;
      } else {
        failed++;
        console.error("[cron weekly-digest] send failed:", r.reason);
      }
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
