"use client";

import { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spotlight color (default rose-glow tint) */
  spotlightColor?: string;
  /** Spotlight radius in px (default 320) */
  radius?: number;
  /** Container className — merges with default card chrome */
  className?: string;
  /** Skip default card chrome (border/bg/shadow). Useful when wrapping existing cards. */
  bare?: boolean;
  children: React.ReactNode;
}

/**
 * Card wrapper that paints a soft radial gradient at the cursor position.
 * Effect respects prefers-reduced-motion (renders flat, no gradient on hover).
 *
 * Default: includes card chrome. Pass `bare` to wrap an existing styled card.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(244,213,215, 0.55)",
  radius = 320,
  bare = false,
  ...props
}: SpotlightCardProps) {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  const [hovered, setHovered] = useState(false);

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 70%)`;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (shouldReduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  const { onMouseMove: userOnMove, onMouseEnter: userOnEnter, onMouseLeave: userOnLeave, ...rest } = props;

  return (
    <div
      ref={ref}
      onMouseMove={(e) => { onMouseMove(e); userOnMove?.(e); }}
      onMouseEnter={(e) => { setHovered(true); userOnEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); userOnLeave?.(e); }}
      className={cn(
        "relative overflow-hidden",
        !bare && "bg-white rounded-3xl border border-[#E9E6DF]/20",
        className,
      )}
      {...rest}
    >
      {/* Spotlight layer — only renders when hovered + motion allowed */}
      {!shouldReduce && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{ background, opacity: hovered ? 1 : 0 }}
          aria-hidden="true"
        />
      )}
      {/* Content sits above spotlight */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
