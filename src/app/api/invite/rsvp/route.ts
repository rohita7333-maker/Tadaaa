import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const ip = getIp(request.headers);
  if (!(await rateLimit(`rsvp:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await request.json()) as {
    inviteId?: string;
    visitorToken?: string;
    name?: string;
  };
  const { inviteId, visitorToken, name } = body;

  if (!inviteId || !visitorToken || typeof visitorToken !== "string") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const visitorHash = createHash("sha256").update(visitorToken).digest("hex");
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 255);
  // Trim + cap defensively; record_rsvp also NULLIFs empty + caps at 80.
  const cleanName =
    typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : null;

  const supabase = await createClient();

  // Creator previews must not pollute stats — views already skip the creator
  // (invite-view.ts); RSVPs get the same guard. RLS lets a signed-in creator
  // read their own invite row; everyone else's probe returns nothing and
  // recording proceeds.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: ownInvite } = await supabase
      .from("invites")
      .select("id")
      .eq("id", inviteId)
      .eq("creator_id", user.id)
      .maybeSingle();
    if (ownInvite) {
      return NextResponse.json({ ok: true, skipped: "creator_preview" });
    }
  }

  // record_rsvp has SECURITY DEFINER + GRANT to anon — validates invite and upserts atomically.
  const { data, error } = await supabase.rpc("record_rsvp", {
    p_invite_id: inviteId,
    p_visitor_hash: visitorHash,
    p_user_agent: ua,
    p_name: cleanName,
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
