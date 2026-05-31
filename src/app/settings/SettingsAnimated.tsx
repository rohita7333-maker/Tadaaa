"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFormStatus } from "react-dom";
import { CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getReducedMotionTransition } from "@/lib/a11y";

interface SectionProps {
  index: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight client wrapper that fades & lifts each settings section in
 * with a staggered cascade. Keeps the surrounding page server-rendered.
 */
export function SettingsSection({ index, children, className }: SectionProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.section
      initial={{ opacity: 0, y: shouldReduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getReducedMotionTransition(shouldReduce, {
        duration: 0.55,
        delay: 0.08 * index,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      })}
      className={className}
    >
      {children}
    </motion.section>
  );
}

interface ToggleProps {
  name: string;
  defaultChecked: boolean;
  label: string;
  sub: string;
}

/**
 * Tailwind-only checkbox-as-toggle. Visible thumb slides via `peer-checked:`.
 * Native checkbox stays in the form for the existing server-action handler.
 */
export function ToggleRow({ name, defaultChecked, label, sub }: ToggleProps) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer p-4 rounded-2xl hover:bg-[#FFF8F0] transition-colors group select-none">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2D2926] font-medium">{label}</p>
        <p className="text-xs text-[#6B5E57] mt-0.5">{sub}</p>
      </div>
      <div className="flex-shrink-0 pt-0.5 relative w-11 h-6">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="sr-only peer"
          aria-label={label}
        />
        {/* Track — peer-checked changes bg color */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[#D4CBC3] peer-checked:bg-[#C4686D] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C4686D]/40 transition-colors duration-300"
        />
        {/* Thumb — peer sibling of checkbox, slides on peer-checked.
            Spring micro-bounce on tap via active: scale (CSS-driven to avoid
            wiring framer-motion to a hidden checkbox). */}
        <span
          aria-hidden="true"
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 will-change-transform peer-checked:translate-x-5 peer-active:scale-90 motion-reduce:peer-active:scale-100"
        />
      </div>
    </label>
  );
}

/**
 * Submit button for the notifications form. While the action is pending the
 * label sweeps with the brand shimmer gradient; once it resolves we briefly
 * pop a checkmark to confirm the save without yanking the user out of flow.
 *
 * Uses useFormStatus so it stays a drop-in replacement for the previous
 * `<button type="submit">` — no parent rewiring needed.
 */
export function SavePreferencesButton() {
  const shouldReduce = useReducedMotion();
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (wasPendingRef.current) {
      wasPendingRef.current = false;
      setJustSaved(true);
      const t = window.setTimeout(() => setJustSaved(false), 1500);
      return () => window.clearTimeout(t);
    }
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 w-full h-11 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#C4686D]/20 disabled:opacity-80 relative overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {justSaved ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0, scale: shouldReduce ? 1 : 0.6 }}
            animate={
              shouldReduce
                ? { opacity: 1, scale: 1 }
                : { opacity: 1, scale: [1, 1.2, 1] }
            }
            exit={{ opacity: 0 }}
            transition={getReducedMotionTransition(shouldReduce, {
              duration: 0.4,
            })}
            className="inline-flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Saved
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getReducedMotionTransition(shouldReduce, {
              duration: 0.15,
            })}
            className={pending ? "shimmer-text-gradient" : ""}
          >
            {pending ? "Saving…" : "Save preferences"}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
