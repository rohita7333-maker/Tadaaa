import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/mobile/gift/[token]  (mobile BFF, public)
 *
 * gift_purchases has RLS enabled with no client policies (service-role only),
 * so the app can't read it with the anon key. This route looks up a gift by its
 * redeem token and returns just the display fields the redeem screen needs —
 * never the Stripe session id or internal ids.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length > 128) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: gift } = await admin
    .from("gift_purchases")
    .select("status, sender_name, gift_message, expires_at, redeemed_at")
    .eq("redeem_token", token)
    .maybeSingle();

  if (!gift) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isExpired = gift.expires_at ? new Date(gift.expires_at) < new Date() : false;
  const state = gift.redeemed_at
    ? "redeemed"
    : isExpired
      ? "expired"
      : "redeemable";

  return NextResponse.json({
    state,
    senderName: gift.sender_name,
    giftMessage: gift.gift_message,
    expiresAt: gift.expires_at,
  });
}
