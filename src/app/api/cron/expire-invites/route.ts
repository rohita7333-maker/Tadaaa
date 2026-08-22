import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { safeBearerCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  // Fail closed: reject if CRON_SECRET is not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (!safeBearerCheck(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Deactivate invites whose expiry has passed.
  //
  // `invites` has NO `status` column — only `gift_purchases` does. This route
  // previously wrote `status: "expired"` and filtered on `.neq("status", …)`,
  // so every run errored and free-tier expiry never actually fired.
  // `is_active` + `expires_at` + `deleted_at` are the source of truth, which is
  // what `src/actions/invite.ts` already reads. Pinned by route.test.ts.
  const { data, error } = await supabase
    .from("invites")
    .update({ is_active: false })
    .lt("expires_at", new Date().toISOString())
    .eq("is_active", true)
    .not("expires_at", "is", null)
    .select("id");

  if (error) {
    console.error("[cron:expire-invites] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length ?? 0 });
}
