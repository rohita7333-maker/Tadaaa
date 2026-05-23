import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { PREMIUM_THEME_PRICE, APP_URL } from "@/lib/constants";
import { giftCheckoutSchema } from "@/lib/schemas";
import { rateLimit, getIp } from "@/lib/rate-limit";

const UNLIMITED_PRICE_YEARLY = 1999; // $19.99 in cents
const PLUS_PRICE_PER_INVITE = Math.round(PREMIUM_THEME_PRICE * 100); // $4.99

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json() as Record<string, unknown>;
  const { mode } = body as { mode?: string };

  // ── Gift checkout: no auth required ──────────────────────────────────────
  if (mode === "gift") {
    const ip = getIp(request.headers);
    if (!(await rateLimit(`gift-checkout:${ip}`, 5, 60_000))) {
      return NextResponse.json(
        { error: "Too many gift checkout attempts. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const parsed = giftCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const { gift_recipient_email, gift_message, gift_sender_name } = parsed.data;

    // Anti-self-gift: when logged in, reject same email
    if (user && user.email && user.email.toLowerCase() === gift_recipient_email.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot send a gift to yourself" },
        { status: 400 }
      );
    }

    const giftPriceId = process.env.STRIPE_GIFT_PRICE_ID;
    if (!giftPriceId) {
      console.error("[gift] STRIPE_GIFT_PRICE_ID not configured");
      return NextResponse.json({ error: "Gift checkout not configured" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: giftPriceId, quantity: 1 }],
      metadata: {
        mode: "gift",
        gift_recipient_email,
        ...(gift_message ? { gift_message } : {}),
        ...(gift_sender_name ? { gift_sender_name } : {}),
        ...(user?.email ? { sender_email: user.email } : {}),
      },
      customer_email: user?.email ?? undefined,
      success_url: `${APP_URL}/gift/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  }

  // For non-gift modes, auth is required
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { themeId } = body as { themeId?: string };

  // Unlimited subscription
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
      metadata: {
        user_id: user.id,
        subscription_type: "unlimited",
      },
      success_url: `${APP_URL}/dashboard?subscription=success`,
      cancel_url: `${APP_URL}/pricing`,
    });
    return NextResponse.json({ url: session.url });
  }

  // Plus — pay per invite (existing theme purchase flow)
  if (!themeId) {
    return NextResponse.json({ error: "Theme ID required" }, { status: 400 });
  }

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
    metadata: {
      theme_id: themeId,
      user_id: user.id,
      subscription_type: "plus",
    },
    success_url: `${APP_URL}/create?theme=${themeId}&payment=success`,
    cancel_url: `${APP_URL}/create?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
