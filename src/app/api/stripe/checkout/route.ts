import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { PREMIUM_THEME_PRICE, APP_URL } from "@/lib/constants";

const UNLIMITED_PRICE_YEARLY = 1999; // $19.99 in cents
const PLUS_PRICE_PER_INVITE = Math.round(PREMIUM_THEME_PRICE * 100); // $4.99

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { mode, themeId } = body as { mode?: string; themeId?: string };

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
