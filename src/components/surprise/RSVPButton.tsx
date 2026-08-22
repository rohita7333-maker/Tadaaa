"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { getVisitorToken, postRsvp } from "@/lib/rsvp-client";

interface RSVPButtonProps {
  theme: Theme;
  title: string;
  /**
   * Accepted for call-site compatibility but no longer rendered — the mockup's
   * `.s-rsvp` scene is clean ink, and floating polaroids sat under the
   * transparent name field and hurt legibility.
   */
  photos?: { url: string; caption?: string; rotation_deg?: number }[];
  inviteId?: string;
}

/** Mockup `burst()` (L856) — the editorial confetti palette, verbatim. */
const BURST_COLORS = ["#D45847", "#CCAC9F", "#1A1A1A", "#F5F0ED"];

/**
 * Closing RSVP beat — mockup `.s-rsvp` / `.rform` / `.dodgezone` / `.btn-no`
 * (L465-472). Ink ground, sand-bordered transparent name field, coral block
 * CTA, and a "No" that runs away from the pointer.
 */
export default function RSVPButton({ theme, title, inviteId }: RSVPButtonProps) {
  const [tapped, setTapped] = useState(false);
  const [name, setName] = useState("");
  const [dodge, setDodge] = useState({ left: "50%", top: "6px" });
  const firedRef = useRef(false);
  const shouldReduce = useReducedMotion();

  async function fireConfetti() {
    // Celebration stays local to the beat that fires it, and never runs when
    // the visitor asked for reduced motion.
    if (shouldReduce) return;
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: BURST_COLORS,
    });
  }

  function handleTap() {
    if (firedRef.current) return;
    firedRef.current = true;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([50, 30, 80, 30, 100]);
    }
    setTapped(true);
    fireConfetti();

    if (inviteId) {
      const token = getVisitorToken();
      const trimmed = name.trim();
      void postRsvp(inviteId, token, trimmed || undefined);
    }
  }

  /** Mockup `dodge(b)` (L1434) — jump the No button somewhere else nearby. */
  function runAway() {
    if (shouldReduce) return;
    const x = (Math.random() - 0.5) * 220;
    const y = Math.random() * 26 - 6;
    setDodge({ left: `calc(50% + ${x}px)`, top: `${Math.max(-4, y)}px` });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-7 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-25 [filter:brightness(0.55)_saturate(0.85)]"
        style={{ background: theme.colors.background }}
      />

      <div className="relative w-full max-w-[300px] text-center" style={{ zIndex: 20 }}>
        <AnimatePresence mode="wait">
          {tapped ? (
            <motion.div
              key="tapped"
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* Mockup `doRsvp` swaps the form for one italic serif line. */}
              <p className="font-heading text-[17px] italic text-sand">
                Recorded. They&rsquo;ll know you&rsquo;re in.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pre"
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Mockup `.s-rsvp .cap2` + `h2` */}
              <p className="mb-2.5 font-heading text-[17px] italic text-sand">
                Don&rsquo;t leave me hanging
              </p>
              <h2 className="mb-6 font-heading text-2xl text-white">{title}</h2>

              {/* Mockup `.rform` */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Your name"
                aria-label="Your name"
                className="mb-3 w-full rounded-[var(--r-sm)] border border-sand bg-transparent px-4 py-[13px] text-center text-white placeholder:text-white/50 focus:outline-2 focus:outline-coral focus:outline-offset-2"
              />
              <button
                type="button"
                onClick={handleTap}
                className="ed-btn ed-btn-coral ed-btn-block"
              >
                Count me in
              </button>

              {/* Mockup `.dodgezone` / `.btn-no` — reduced motion pins it still
                  so the answer is always reachable. */}
              <div className="relative mt-3 h-14">
                <button
                  type="button"
                  onMouseEnter={runAway}
                  onFocus={runAway}
                  onClick={runAway}
                  style={{ left: dodge.left, top: dodge.top }}
                  className="absolute min-h-10 -translate-x-1/2 rounded-[var(--r-pill)] border border-sand bg-transparent px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-sand transition-[left,top] duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
                >
                  No, I&rsquo;m busy
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
