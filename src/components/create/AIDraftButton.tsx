"use client";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { springs, durations, makeReducedMotionTransition } from "@/lib/motion";
import type { Draft } from "@/lib/ai/draft";
import { INPUT } from "./editorial";

const TONES = ["warm", "playful", "elegant", "heartfelt", "funny"] as const;
type Tone = (typeof TONES)[number];

export function AIDraftButton({ onDraft }: { onDraft: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [tone, setTone] = useState<Tone>("warm");
  const [details, setDetails] = useState("");
  const shouldReduce = useReducedMotion();

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
      if (r.status === 503) {
        toast.error("AI drafting is taking a breather. Write your message by hand for now.");
        return;
      }
      if (!r.ok) {
        toast.error("Draft hit a snag. Give it another go.");
        return;
      }
      const { draft } = await r.json();
      onDraft(draft);
      setOpen(false);
      toast.success("Draft ready. Tweak anything you like.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!open ? (
        <motion.button
          key="trigger"
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
          className="ed-btn ed-btn-line ed-btn-sm shrink-0"
        >
          <Sparkles className="size-3.5" />
          Draft with AI
        </motion.button>
      ) : (
        <motion.div
          key="panel"
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
          transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
          className="rounded-[var(--r-md)] border border-mist bg-paper p-5 space-y-4 shadow-[var(--sh-card)]"
        >
          <div className="flex items-center justify-between">
            <span className="font-heading text-ink text-base flex items-center gap-2">
              <motion.span
                animate={loading && !shouldReduce ? { rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] } : {}}
                transition={loading ? { repeat: Infinity, duration: durations.slow } : {}}
                style={{ display: "inline-flex" }}
              >
                <Sparkles className="size-4 text-coral" />
              </motion.span>
              AI Invite Drafter
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-stone hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Who's it for? (e.g. Mom, best friend)"
              className={INPUT}
              maxLength={50}
            />
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Occasion (e.g. 60th birthday, surprise homecoming)"
              className={INPUT}
              maxLength={80}
            />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className={INPUT}
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
              placeholder="Any extra details? Optional, e.g. loves hiking, she'll be nervous"
              className={`${INPUT} resize-none`}
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ed-btn ed-btn-line ed-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={go}
              disabled={loading || !recipient.trim() || !occasion.trim()}
              className="ed-btn ed-btn-ink ed-btn-sm"
            >
              {loading ? "Drafting…" : "Generate"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
