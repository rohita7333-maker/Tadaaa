"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

interface ReportButtonProps {
  inviteId: string;
}

const REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "explicit", label: "Explicit or adult content" },
  { value: "spam", label: "Spam or scam" },
  { value: "other", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export default function ReportButton({ inviteId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, reason, details }),
      });
    } catch {
      // Non-blocking
    }
    setLoading(false);
    setDone(true);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/60 hover:bg-black/30 hover:text-white/80 transition-all z-50"
        aria-label="Report this content"
      >
        <Flag className="w-4 h-4" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-[100] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            {done ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-3">✅</p>
                <h3 className="font-heading text-xl text-[#2D2926] mb-2">Report submitted</h3>
                <p className="text-sm text-[#6B5E57] mb-4">
                  Thanks for helping keep TaDaaaa safe.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="h-10 px-6 rounded-full bg-[#F5EDE3] text-[#6B5E57] text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-heading text-xl text-[#2D2926] mb-1">Report content</h3>
                <p className="text-sm text-[#6B5E57] mb-5">
                  Select a reason and we&apos;ll review this surprise.
                </p>

                <div className="space-y-2 mb-4">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        reason === r.value
                          ? "border-[#C4686D] bg-[#FFF0E8]"
                          : "border-[#D4CBC3]/50 hover:border-[#C4686D]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-[#C4686D]"
                      />
                      <span className="text-sm text-[#2D2926]">{r.label}</span>
                    </label>
                  ))}
                </div>

                {reason === "other" && (
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Tell us more (optional)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-[#D4CBC3] text-sm resize-none outline-none focus:border-[#C4686D] transition-colors mb-4"
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 h-11 rounded-full border border-[#D4CBC3] text-[#6B5E57] text-sm hover:bg-[#FFF0E8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || loading}
                    className="flex-1 h-11 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                  >
                    {loading ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
