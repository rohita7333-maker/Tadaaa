"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gift, X, Loader2 } from "lucide-react";

interface GiftCTAProps {
  label: string;
  className: string;
}

export default function GiftCTA({ label, className }: GiftCTAProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

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
      <button onClick={() => setShowModal(true)} className={className}>
        <Gift className="w-4 h-4 mr-2 inline-block" />
        {label}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Send a gift invite"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-[#6B5E57] hover:text-[#2D2926] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-xl text-[#2D2926]">Send a gift invite</h2>
                <p className="text-sm text-[#6B5E57]">$5 · one TaDaaaa invite</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="gift-recipient"
                  className="block text-sm font-medium text-[#2D2926] mb-1.5"
                >
                  Recipient&apos;s email <span className="text-[#C4686D]">*</span>
                </label>
                <input
                  id="gift-recipient"
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full h-11 px-4 rounded-xl border border-[#D4CBC3] text-[#2D2926] placeholder:text-[#B5A9A3] focus:outline-none focus:ring-2 focus:ring-[#C4686D]/30 focus:border-[#C4686D] text-sm transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="gift-sender"
                  className="block text-sm font-medium text-[#2D2926] mb-1.5"
                >
                  Your name <span className="text-[#B5A9A3] font-normal">(optional)</span>
                </label>
                <input
                  id="gift-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Alice"
                  maxLength={100}
                  className="w-full h-11 px-4 rounded-xl border border-[#D4CBC3] text-[#2D2926] placeholder:text-[#B5A9A3] focus:outline-none focus:ring-2 focus:ring-[#C4686D]/30 focus:border-[#C4686D] text-sm transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="gift-message"
                  className="block text-sm font-medium text-[#2D2926] mb-1.5"
                >
                  Personal message <span className="text-[#B5A9A3] font-normal">(optional)</span>
                </label>
                <textarea
                  id="gift-message"
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Happy birthday! Thought you'd love making one of these for someone special…"
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#D4CBC3] text-[#2D2926] placeholder:text-[#B5A9A3] focus:outline-none focus:ring-2 focus:ring-[#C4686D]/30 focus:border-[#C4686D] text-sm transition-colors resize-none"
                />
                <p className="text-xs text-[#B5A9A3] mt-1 text-right">
                  {giftMessage.length}/500
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !recipientEmail}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white font-semibold text-sm flex items-center justify-center hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 shadow-md shadow-[#C4686D]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Going to checkout…
                  </>
                ) : (
                  "Continue to payment →"
                )}
              </button>
            </form>

            <p className="text-xs text-[#B5A9A3] text-center mt-4">
              Powered by Stripe · secure checkout
            </p>
          </div>
        </div>
      )}
    </>
  );
}
