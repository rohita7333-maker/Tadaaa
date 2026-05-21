import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Fail closed: reject if CRON_SECRET is not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Mark expired invites as inactive AND set status. Page queries read either
  // is_active or status — keep them in sync so cron actually takes effect.
  const { data, error } = await supabase
    .from("invites")
    .update({ status: "expired", is_active: false })
    .lt("expires_at", new Date().toISOString())
    .neq("status", "expired")
    .not("expires_at", "is", null)
    .select("id");

  if (error) {
    console.error("[cron:expire-invites] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length ?? 0 });
}
