"use client";

import { motion, useReducedMotion } from "framer-motion";
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
      <div className="flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="sr-only peer"
          aria-label={label}
        />
        <span
          aria-hidden="true"
          className="block w-11 h-6 rounded-full bg-[#D4CBC3] peer-checked:bg-[#C4686D] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C4686D]/40 transition-colors duration-300 relative peer-checked:[&>span]:translate-x-5"
        >
          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 will-change-transform" />
        </span>
      </div>
    </label>
  );
}
