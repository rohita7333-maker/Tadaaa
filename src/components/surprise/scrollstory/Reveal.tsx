"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { durations, easings } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Shared one-shot scene entrance: fade + rise on first scroll into view.
 * Reduced motion → ≤200ms opacity-only fade (no translate).
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={
        reduced
          ? { duration: durations.quick }
          : { duration: durations.slow, ease: easings.entrance, delay }
      }
    >
      {children}
    </motion.div>
  );
}
