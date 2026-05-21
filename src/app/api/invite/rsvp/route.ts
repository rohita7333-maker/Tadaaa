import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const ip = getIp(request.headers);
  if (!(await rateLimit(`rsvp:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await request.json()) as { inviteId?: string; visitorToken?: string };
  const { inviteId, visitorToken } = body;

  if (!inviteId || !visitorToken || typeof visitorToken !== "string") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verify invite is active + not expired
  const { data: invite } = await supabase
    .from("invites")
    .select("id, is_active, expires_at, status")
    .eq("id", inviteId)
    .single();

  const isExpired =
    invite?.expires_at && new Date(invite.expires_at) < new Date();

  if (!invite || !invite.is_active || invite.status === "expired" || isExpired) {
    return NextResponse.json({ error: "Invite unavailable" }, { status: 410 });
  }

  // Hash visitor token server-side so we don't store the raw client value.
  const visitorHash = createHash("sha256").update(visitorToken).digest("hex");
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 255);

  // Idempotent — ON CONFLICT do nothing means second RSVP from same visitor is a no-op.
  const { error } = await supabase
    .from("invite_rsvps")
    .upsert(
      { invite_id: inviteId, visitor_hash: visitorHash, user_agent: ua },
      { onConflict: "invite_id,visitor_hash", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[rsvp] insert failed:", error);
    return NextResponse.json({ error: "Failed to record RSVP" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
