/**
 * Tests for D2: $5 gift checkout
 *
 * Covers:
 * 1. giftCheckoutSchema — Zod validation
 * 2. giftInviteEmail   — template shape
 * 3. Webhook handler   — gift mode creates gift_purchases row + sends email
 * 4. Webhook handler   — idempotent replay returns 200, no duplicate insert
 * 5. Webhook handler   — bad signature → 400
 * 6. Checkout route    — gift mode → returns Stripe URL
 * 7. Checkout route    — rejects self-gift
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ────────────────────────────────────────────────────────────────────────────
// 1. Schema validation
// ────────────────────────────────────────────────────────────────────────────
import { giftCheckoutSchema } from "./schemas";

describe("giftCheckoutSchema", () => {
  it("accepts valid gift payload", () => {
    const r = giftCheckoutSchema.safeParse({
      mode: "gift",
      gift_recipient_email: "bob@example.com",
    });
    expect(r.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const r = giftCheckoutSchema.safeParse({
      mode: "gift",
      gift_recipient_email: "bob@example.com",
      gift_message: "Happy birthday!",
      gift_sender_name: "Alice",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing recipient email", () => {
    const r = giftCheckoutSchema.safeParse({ mode: "gift" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid recipient email", () => {
    const r = giftCheckoutSchema.safeParse({
      mode: "gift",
      gift_recipient_email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });

  it("rejects wrong mode", () => {
    const r = giftCheckoutSchema.safeParse({
      mode: "plus",
      gift_recipient_email: "bob@example.com",
    });
    expect(r.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. giftInviteEmail template
// ────────────────────────────────────────────────────────────────────────────
import { giftInviteEmail } from "./email/templates";

describe("giftInviteEmail", () => {
  it("includes recipient magic link in HTML", () => {
    const { html } = giftInviteEmail({
      recipientEmail: "bob@example.com",
      redeemUrl: "https://tadaaaa.app/gift/redeem?token=abc",
      senderName: "Alice",
      giftMessage: "Happy birthday!",
    });
    expect(html).toContain("https://tadaaaa.app/gift/redeem?token=abc");
  });

  it("includes sender name in subject", () => {
    const { subject } = giftInviteEmail({
      recipientEmail: "bob@example.com",
      redeemUrl: "https://tadaaaa.app/gift/redeem?token=abc",
      senderName: "Alice",
    });
    expect(subject).toContain("Alice");
  });

  it("falls back gracefully when no sender name", () => {
    const { subject, html } = giftInviteEmail({
      recipientEmail: "bob@example.com",
      redeemUrl: "https://tadaaaa.app/gift/redeem?token=abc",
    });
    // Should not throw and should still contain the redeem URL
    expect(html).toContain("https://tadaaaa.app/gift/redeem?token=abc");
    expect(subject).toBeTruthy();
  });

  it("HTML-escapes gift message to prevent XSS", () => {
    const { html } = giftInviteEmail({
      recipientEmail: "bob@example.com",
      redeemUrl: "https://tadaaaa.app/gift/redeem?token=abc",
      giftMessage: "<script>alert('xss')</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes plain-text fallback", () => {
    const result = giftInviteEmail({
      recipientEmail: "bob@example.com",
      redeemUrl: "https://tadaaaa.app/gift/redeem?token=abc",
    });
    expect(result.text).toContain("https://tadaaaa.app/gift/redeem?token=abc");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3–5. Webhook handler unit tests
// ────────────────────────────────────────────────────────────────────────────

// We need to mock: stripe, supabase/server, email/send, audit
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

// Track what gets inserted into gift_purchases
const giftInserts: unknown[] = [];
const giftInsertMock = vi.fn((...args: unknown[]) => {
  giftInserts.push(args[0]);
  // Return chainable object for .select().single()
  return {
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { redeem_token: "token-abc-123", id: "gift-id-001" },
        error: null,
      }),
    }),
  };
});

// claim_stripe_event: first call returns true (claimed), second returns false (dup)
let claimCount = 0;
const claimMock = vi.fn(() => {
  claimCount++;
  return { data: claimCount === 1 };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn((fn: string) => {
      if (fn === "claim_stripe_event") return claimMock();
      if (fn === "verify_stripe_customer") return { data: true };
      return { data: null };
    }),
    from: vi.fn((table: string) => {
      if (table === "gift_purchases") {
        return {
          insert: giftInsertMock,
        };
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
    }),
  })),
}));

const sendEmailMock = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email/send", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

function makeGiftSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_gift_001",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    customer_email: "alice@example.com",
    customer: null,
    metadata: {
      mode: "gift",
      gift_recipient_email: "bob@example.com",
      gift_message: "Happy birthday!",
      gift_sender_name: "Alice",
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function makeStripeEvent(session: Stripe.Checkout.Session): Stripe.Event {
  return {
    id: "evt_test_gift_001",
    type: "checkout.session.completed",
    object: "event",
    data: { object: session },
  } as unknown as Stripe.Event;
}

async function callWebhook(body: string, sig: string) {
  // Dynamically import to pick up mocks
  const { POST } = await import("@/app/api/stripe/webhook/route");
  const req = new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": sig, "content-type": "text/plain" },
    body,
  });
  // NextRequest wrapper
  const { NextRequest } = await import("next/server");
  return POST(new NextRequest(req));
}

describe("webhook — gift mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    giftInserts.length = 0;
    claimCount = 0;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_GIFT_PRICE_ID = "price_gift_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://tadaaaa.app";
  });

  it("inserts gift_purchases row and sends email on valid gift event", async () => {
    const session = makeGiftSession();
    const event = makeStripeEvent(session);

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event);

    const res = await callWebhook(JSON.stringify(event), "sig_ok");
    expect(res.status).toBe(200);

    // gift_purchases row must be inserted
    expect(giftInsertMock).toHaveBeenCalledTimes(1);
    const inserted = giftInserts[0] as Record<string, unknown>;
    expect(inserted.stripe_session_id).toBe("cs_test_gift_001");
    expect(inserted.recipient_email).toBe("bob@example.com");
    expect(inserted.sender_name).toBe("Alice");

    // Email must be sent to recipient
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [to] = sendEmailMock.mock.calls[0] as [string, string, string];
    expect(to).toBe("bob@example.com");
  });

  it("returns 200 on duplicate webhook replay without re-inserting", async () => {
    const session = makeGiftSession();
    const event = makeStripeEvent(session);
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event);

    // First call succeeds
    await callWebhook(JSON.stringify(event), "sig_ok");

    // Reset giftInsertMock count but keep claimCount incrementing
    giftInsertMock.mockClear();

    // Second call should be treated as duplicate
    const res2 = await callWebhook(JSON.stringify(event), "sig_ok");
    expect(res2.status).toBe(200);

    // No second insert
    expect(giftInsertMock).not.toHaveBeenCalled();
  });

  it("returns 400 when stripe signature is invalid", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await callWebhook("{}", "bad_sig");
    expect(res.status).toBe(400);
  });

  it("returns 200 even when email send fails (no webhook retry)", async () => {
    const session = makeGiftSession();
    const event = makeStripeEvent(session);
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event);
    sendEmailMock.mockResolvedValueOnce({ success: false, error: "Resend down" });

    const res = await callWebhook(JSON.stringify(event), "sig_ok");
    // Must still 200 — Stripe should not retry
    expect(res.status).toBe(200);
    // Row still inserted despite email failure
    expect(giftInsertMock).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6–7. Checkout route unit tests
// ────────────────────────────────────────────────────────────────────────────

describe("checkout route — gift mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_GIFT_PRICE_ID = "price_gift_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://tadaaaa.app";
  });

  async function callCheckout(body: Record<string, unknown>, userEmail?: string) {
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const { NextRequest } = await import("next/server");

    // Override createClient for this test to return user with specific email
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: userEmail ? { id: "user_123", email: userEmail } : null,
          },
        }),
      },
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const req = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return POST(req);
  }

  it("returns Stripe checkout URL for valid gift mode (logged-out user)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (stripe.checkout.sessions.create as any).mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_xxx",
    });

    const res = await callCheckout({
      mode: "gift",
      gift_recipient_email: "bob@example.com",
      gift_sender_name: "Alice",
    });

    expect(res.status).toBe(200);
    const json = await res.json() as { url: string };
    expect(json.url).toContain("checkout.stripe.com");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({
          mode: "gift",
          gift_recipient_email: "bob@example.com",
        }),
      })
    );
  });

  it("rejects self-gift when user is logged in", async () => {
    const res = await callCheckout(
      {
        mode: "gift",
        gift_recipient_email: "alice@example.com", // same as sender
      },
      "alice@example.com" // logged-in user email
    );
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/self/i);
  });

  it("rejects invalid recipient email", async () => {
    const res = await callCheckout({
      mode: "gift",
      gift_recipient_email: "not-valid",
    });
    expect(res.status).toBe(400);
  });
});
