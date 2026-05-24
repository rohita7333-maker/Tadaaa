"use client";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Draft } from "@/lib/ai/draft";

const TONES = ["warm", "playful", "elegant", "heartfelt", "funny"] as const;
type Tone = (typeof TONES)[number];

export function AIDraftButton({ onDraft }: { onDraft: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [tone, setTone] = useState<Tone>("warm");
  const [details, setDetails] = useState("");

  async function go() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/draft-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, occasion, tone, details: details || undefined }),
      });
      if (r.status === 429) {
        toast.error("You've used 10 AI drafts this hour. Try again later.");
        return;
      }
      if (r.status === 422) {
        toast.error("Input wasn't suitable for a surprise invite.");
        return;
      }
      if (!r.ok) {
        toast.error("Couldn't generate a draft — try again.");
        return;
      }
      const { draft } = await r.json();
      onDraft(draft);
      setOpen(false);
      toast.success("Draft ready — tweak anything you like!");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
      >
        <Sparkles className="size-4" />
        Draft with AI
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#D4CBC3] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-heading text-[#2D2926] text-base flex items-center gap-2">
          <Sparkles className="size-4 text-violet-500" />
          AI Invite Drafter
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[#6B5E57] hover:text-[#2D2926]"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3">
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Who's it for? (e.g. Mom, best friend)"
          className="w-full rounded-md border border-[#D4CBC3] px-3 py-2 text-sm text-[#2D2926] placeholder:text-[#9C8E87] focus:outline-none focus:ring-1 focus:ring-[#C4686D]"
          maxLength={50}
        />
        <input
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="Occasion (e.g. 60th birthday, surprise homecoming)"
          className="w-full rounded-md border border-[#D4CBC3] px-3 py-2 text-sm text-[#2D2926] placeholder:text-[#9C8E87] focus:outline-none focus:ring-1 focus:ring-[#C4686D]"
          maxLength={80}
        />
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          className="w-full rounded-md border border-[#D4CBC3] px-3 py-2 text-sm text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#C4686D]"
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Any extra details? (optional — e.g. loves hiking, she'll be nervous)"
          className="w-full rounded-md border border-[#D4CBC3] px-3 py-2 text-sm text-[#2D2926] placeholder:text-[#9C8E87] focus:outline-none focus:ring-1 focus:ring-[#C4686D] resize-none"
          rows={2}
          maxLength={300}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-full border border-[#D4CBC3] text-sm text-[#6B5E57] hover:bg-[#FFF8F0]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={go}
          disabled={loading || !recipient.trim() || !occasion.trim()}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading ? <span className="shimmer-text-gradient">Drafting…</span> : "Generate"}
        </button>
      </div>
    </div>
  );
}
