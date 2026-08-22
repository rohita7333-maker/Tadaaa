"use client";

import { useState } from "react";
import { toast } from "sonner";
import { pricingPlans } from "@/lib/pricing";

interface GiftCTAProps {
  label: string;
  className: string;
}

// Field atoms — mockup `.field`.
const FIELD_LABEL =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-stone mb-[7px]";
const FIELD_INPUT =
  "w-full px-[14px] py-[13px] rounded-[var(--r-sm)] border border-mist bg-paper text-ink placeholder:text-stone/55 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-coral focus:shadow-[0_0_0_1px_var(--coral)]";

export default function GiftCTA({ label, className }: GiftCTAProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  // Price copy reads from the plan table so it can never drift from checkout.
  const giftPlan = pricingPlans.find((p) => p.planKey === "gift");
  const giftPriceLabel =
    giftPlan && giftPlan.monthlyPrice !== null
      ? `$${giftPlan.monthlyPrice} · ${giftPlan.periodOverride ?? ""}`.trim()
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientEmail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "gift",
          gift_recipient_email: recipientEmail,
          ...(senderName ? { gift_sender_name: senderName } : {}),
          ...(giftMessage ? { gift_message: giftMessage } : {}),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Could not start checkout — try again");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Could not start checkout — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setShowModal(true)} className={className}>
        {label}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Send a gift invite"
        >
          <div className="bg-paper border border-mist rounded-[var(--r-md)] shadow-[var(--sh-float)] w-full max-w-[400px] px-9 py-10 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-xs text-stone hover:text-ink transition-colors p-1.5"
              aria-label="Close"
            >
              Close
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone">
              Gift invite
            </p>
            <h2 className="text-[26px] mt-1 mb-1">Send a gift invite</h2>
            <p className="text-sm mb-[26px]">{giftPriceLabel}</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="gift-recipient" className={FIELD_LABEL}>
                  Recipient&apos;s email
                </label>
                <input
                  id="gift-recipient"
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className={FIELD_INPUT}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="gift-sender" className={FIELD_LABEL}>
                  Your name (optional)
                </label>
                <input
                  id="gift-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Alice"
                  maxLength={100}
                  className={FIELD_INPUT}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="gift-message" className={FIELD_LABEL}>
                  Personal message (optional)
                </label>
                <textarea
                  id="gift-message"
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Thought you'd love making one of these for someone special…"
                  maxLength={500}
                  rows={3}
                  className={`${FIELD_INPUT} resize-none`}
                />
                <p className="text-xs text-stone mt-1 text-right">
                  {giftMessage.length}/500
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !recipientEmail}
                className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-[30px] py-[14px] rounded-full text-[13px] font-semibold uppercase tracking-[0.08em] bg-coral text-white transition-[transform,box-shadow,background-color] duration-[180ms] ease-out hover:bg-coral-deep hover:shadow-[var(--sh-card)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Going to checkout…" : "Continue to payment"}
              </button>
            </form>

            <p className="text-xs text-stone text-center mt-4">
              Powered by Stripe · secure checkout
            </p>
          </div>
        </div>
      )}
    </>
  );
}
