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
 * The mockup's notification row: `.setrow` carrying a `.sw` switch
 * (tandaaaa-editorial.html:406-410 and 343-348). The native checkbox stays in
 * the form so the existing server action keeps working unchanged; the visible
 * track and thumb are the checkbox's own sibling, driven by `:checked`.
 */
export function ToggleRow({ name, defaultChecked, label, sub }: ToggleProps) {
  return (
    <div className="ed-setrow">
      <div className="ed-m">
        <h3>{label}</h3>
        <p>{sub}</p>
      </div>
      <label className="ed-sw">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-label={label}
        />
        <span className="ed-tr" aria-hidden="true" />
      </label>
    </div>
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
      className="ed-btn ed-btn-ink ed-btn-sm ed-btn-block mt-5 relative overflow-hidden"
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
