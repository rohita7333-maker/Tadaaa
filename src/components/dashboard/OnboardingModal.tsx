"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { X, ArrowRight, ImageIcon, MessageSquare, Sparkles } from "lucide-react";
import { springs, durations, easings, makeReducedMotionTransition } from "@/lib/motion";

const STORAGE_KEY = "tadaaaa.onboarded";

interface OnboardingModalProps {
  /** Only show on first visit when the dashboard is empty. */
  forceShow?: boolean;
}

const steps = [
  {
    icon: ImageIcon,
    eyebrow: "Step 1",
    title: "Pick a moment worth remembering",
    body:
      "A birthday. A reveal. A way of saying “thank you” that a text can’t carry. Whatever it is, start there.",
  },
  {
    icon: MessageSquare,
    eyebrow: "Step 2",
    title: "Make it feel like you",
    body:
      "Drop in a few photos, write the message you’d say out loud, and add a yes/no question if you want a reply.",
  },
  {
    icon: Sparkles,
    eyebrow: "Step 3",
    title: "Hand it over with a link",
    body:
      "We turn it into a tap-to-reveal page they can open from anywhere. You see views and answers in your dashboard.",
  },
];

export default function OnboardingModal({ forceShow = false }: OnboardingModalProps) {
  const shouldReduce = useReducedMotion();
  // SSR + first client render = same output (closed). After mount, read
  // localStorage and conditionally open. Two-render pattern avoids
  // hydration mismatch.
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // External-state sync from localStorage. setState-in-effect is required
    // here so SSR + first client render agree (both closed); lazy-init
    // would mismatch on dashboards loaded with cookies.
    if (!forceShow) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!seen) setOpen(true);
    } catch {
      // private mode / blocked storage — leave closed.
    }
  }, [forceShow]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {}
    setOpen(false);
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D2926]/40 backdrop-blur-sm px-4 sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
          onClick={dismiss}
        >
          <motion.div
            className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_60px_rgba(45,41,38,0.18)] border border-[#D4CBC3]/40 overflow-hidden"
            initial={{ y: shouldReduce ? 0 : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: shouldReduce ? 0 : 40, opacity: 0 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 24 : 10,
                      background: i <= step ? "#C4686D" : "#E7DED5",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={dismiss}
                aria-label="Close onboarding"
                className="w-8 h-8 rounded-full text-[#6B5E57] hover:bg-[#FFF8F0] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step content — AnimatePresence swaps on step change with directional slide */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                className="px-6 pt-6 pb-2 text-left"
                initial={{ opacity: 0, x: shouldReduce ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: shouldReduce ? 0 : -12 }}
                transition={makeReducedMotionTransition(shouldReduce, {
                  duration: durations.quick,
                  ease: easings.entrance,
                })}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(196,104,109,0.12), rgba(201,169,110,0.12))",
                  }}
                >
                  <current.icon className="w-5 h-5 text-[#C4686D]" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C4686D] mb-2">
                  {current.eyebrow}
                </p>
                <h2
                  id="onboarding-title"
                  className="font-heading text-[22px] leading-tight text-[#2D2926] mb-3"
                >
                  {current.title}
                </h2>
                <p className="text-[#6B5E57] text-sm leading-relaxed">{current.body}</p>
              </motion.div>
            </AnimatePresence>

            <div className="px-6 pt-6 pb-6 flex items-center justify-between">
              <button
                onClick={dismiss}
                aria-label="Skip onboarding for now"
                className="text-xs text-[#6B5E57] hover:text-[#2D2926] underline underline-offset-2"
              >
                Skip for now
              </button>
              {isLast ? (
                <Link
                  href="/create"
                  onClick={() => {
                    try {
                      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
                    } catch {}
                  }}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all shadow-md shadow-[#C4686D]/25"
                >
                  Create my first
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  aria-label={`Go to step ${step + 2} of ${steps.length}`}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all shadow-md shadow-[#C4686D]/25"
                >
                  Keep going
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
