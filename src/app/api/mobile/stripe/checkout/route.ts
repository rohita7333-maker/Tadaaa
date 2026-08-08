import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PREMIUM_THEME_PRICE, APP_URL } from "@/lib/constants";
import { getBearerUser } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/stripe/checkout  (mobile BFF)
 *
 * Bearer-authed twin of /api/stripe/checkout for the two authed upgrade paths:
 *   mode "unlimited" → yearly subscription (unlocks everything)
 *   mode "plus"      → one-time premium-theme unlock (requires themeId)
 * Returns { url } — the app opens it in an in-app browser. The existing Stripe
 * webhook (unchanged) fulfils the purchase and updates the tier server-side.
 * Gift purchase checkout is intentionally not mirrored here (out of scope).
 */
const UNLIMITED_PRICE_YEARLY = 1999; // $19.99 in cents — matches web route
const PLUS_PRICE_PER_INVITE = Math.round(PREMIUM_THEME_PRICE * 100); // $4.99

export async function POST(request: NextRequest) {
  const user = await getBearerUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { mode?: string; themeId?: string };
  try {
    body = (await request.json()) as { mode?: string; themeId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { mode, themeId } = body;

  if (mode === "unlimited") {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: UNLIMITED_PRICE_YEARLY,
            recurring: { interval: "year" },
            product_data: {
              name: "TaDaaaa Unlimited",
              description: "Unlimited surprises, all premium themes, 1 year",
            },
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: user.id, subscription_type: "unlimited" },
      success_url: `${APP_URL}/dashboard?subscription=success`,
      cancel_url: `${APP_URL}/pricing`,
    });
    return NextResponse.json({ url: session.url });
  }

  if (mode === "plus") {
    if (!themeId) return NextResponse.json({ error: "Theme ID required" }, { status: 400 });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PLUS_PRICE_PER_INVITE,
            product_data: {
              name: `Premium Theme: ${themeId}`,
              description: "Unlock a premium TaDaaaa theme",
            },
          },
          quantity: 1,
        },
      ],
      metadata: { theme_id: themeId, user_id: user.id, subscription_type: "plus" },
      success_url: `${APP_URL}/create?theme=${themeId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/create?payment=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "Unsupported checkout mode" }, { status: 400 });
}
