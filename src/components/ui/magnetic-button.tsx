"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Max pull distance in pixels (default 8) */
  pullStrength?: number;
  /** Child can be element or text */
  children: React.ReactNode;
  /** Override class */
  className?: string;
}

/**
 * Magnetic button — cursor-follow translate with spring physics.
 * On touch devices + reduced-motion: collapses to standard button (no pull).
 *
 * Default styling: brand rose pill with shadow. Override entirely via className if needed.
 */
export function MagneticButton({
  children,
  className,
  pullStrength = 8,
  ...props
}: MagneticButtonProps) {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  const x = useSpring(0, { stiffness: 200, damping: 18, mass: 0.4 });
  const y = useSpring(0, { stiffness: 200, damping: 18, mass: 0.4 });

  function onMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (shouldReduce || isTouch || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    x.set(dx * pullStrength);
    y.set(dy * pullStrength);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  function onTouchStart() {
    setIsTouch(true);
  }

  return (
    <motion.button
      ref={ref}
      style={shouldReduce || isTouch ? undefined : { x, y }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      whileTap={shouldReduce ? undefined : { scale: 0.97 }}
      className={cn(
        "btn-pri",
        "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium",
        "bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white",
        "shadow-[0_8px_24px_rgba(62,107,92,0.35)] hover:shadow-[0_12px_32px_rgba(62,107,92,0.5)]",
        "transition-shadow duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
