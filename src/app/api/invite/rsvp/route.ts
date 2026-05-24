import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  const visitorHash = createHash("sha256").update(visitorToken).digest("hex");
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 255);

  // record_rsvp has SECURITY DEFINER + GRANT to anon — validates invite and upserts atomically.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_rsvp", {
    p_invite_id: inviteId,
    p_visitor_hash: visitorHash,
    p_user_agent: ua,
  });

  if (error) {
    console.error("[rsvp] rpc failed:", error);
    return NextResponse.json({ error: "Failed to record RSVP" }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json({ error: "Invite unavailable" }, { status: 410 });
  }

  return NextResponse.json({ ok: true });
}
