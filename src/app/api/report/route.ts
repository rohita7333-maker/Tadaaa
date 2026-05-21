import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

const VALID_REASONS = ["harassment", "explicit", "spam", "other"] as const;
type Reason = (typeof VALID_REASONS)[number];

export async function POST(request: NextRequest) {
  const ip = getIp(request.headers);
  if (!(await rateLimit(`report:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json() as { inviteId?: string; reason?: string; details?: string };
  const { inviteId, reason, details } = body;

  if (!inviteId || !reason || !VALID_REASONS.includes(reason as Reason)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("invites")
    .select("id")
    .eq("id", inviteId)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await supabase.from("content_reports").insert({
    invite_id: inviteId,
    reason: reason as Reason,
    details: typeof details === "string" ? details.slice(0, 500) : null,
  });

  return NextResponse.json({ ok: true });
}
