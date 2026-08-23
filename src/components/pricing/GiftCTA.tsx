"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gift, X, Loader2 } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";

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
      <MagneticButton type="button" onClick={() => setShowModal(true)} className={className}>
        <Gift className="w-4 h-4 mr-2 inline-block" />
        {label}
      </MagneticButton>

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
              className="absolute top-5 right-5 text-[#6F6E68] hover:text-[#1A1B18] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-xl text-[#1A1B18]">Send a gift invite</h2>
                <p className="text-sm text-[#6F6E68]">$5 · one TaDaaaa invite</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="gift-recipient"
                  className="block text-sm font-medium text-[#1A1B18] mb-1.5"
                >
                  Recipient&apos;s email <span className="text-[#3E6B5C]">*</span>
                </label>
                <input
                  id="gift-recipient"
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E6DF] text-[#1A1B18] placeholder:text-[#B5A9A3] focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/30 focus:border-[#3E6B5C] text-sm transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="gift-sender"
                  className="block text-sm font-medium text-[#1A1B18] mb-1.5"
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
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E6DF] text-[#1A1B18] placeholder:text-[#B5A9A3] focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/30 focus:border-[#3E6B5C] text-sm transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="gift-message"
                  className="block text-sm font-medium text-[#1A1B18] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-xl border border-[#E9E6DF] text-[#1A1B18] placeholder:text-[#B5A9A3] focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/30 focus:border-[#3E6B5C] text-sm transition-colors resize-none"
                />
                <p className="text-xs text-[#B5A9A3] mt-1 text-right">
                  {giftMessage.length}/500
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !recipientEmail}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white font-semibold text-sm flex items-center justify-center hover:from-[#2E5145] hover:to-[#3E6B5C] transition-all duration-300 shadow-md shadow-[#3E6B5C]/20 disabled:opacity-60 disabled:cursor-not-allowed"
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
