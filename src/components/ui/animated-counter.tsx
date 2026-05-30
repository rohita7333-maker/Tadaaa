"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { easings, durations } from "@/lib/motion";

interface AnimatedCounterProps {
  /** Final value to count up to */
  value: number;
  /** Starting value (default 0) */
  from?: number;
  /** Duration in seconds (default durations.slow = 0.6) */
  duration?: number;
  /** Format helper — e.g. v => `${v.toLocaleString()}+` */
  format?: (v: number) => string;
  /** Trigger again every time element re-enters viewport (default false — fires once) */
  triggerOnce?: boolean;
  className?: string;
  /** Render as inline element (default true) */
  inline?: boolean;
}

/**
 * Animated number counter that springs from `from` → `value` on viewport enter.
 * Respects prefers-reduced-motion (renders final value immediately).
 *
 * Used by: dashboard stats, landing live count, pricing prices.
 */
export function AnimatedCounter({
  value,
  from = 0,
  duration = durations.slow,
  format = (v) => Math.round(v).toLocaleString(),
  triggerOnce = true,
  className,
  inline = true,
}: AnimatedCounterProps) {
  const shouldReduce = useReducedMotion();
  const { ref, inView } = useInView({ triggerOnce, threshold: 0.3 });
  // SSR-safe: always start from `from` so server + first client render match.
  // Effect immediately jumps to `value` when reduced-motion is active.
  const [display, setDisplay] = useState(from);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView) return;
    if (shouldReduce) {
      setDisplay(value);
      return;
    }
    if (triggerOnce && hasRun.current) return;
    hasRun.current = true;

    const controls = animate(from, value, {
      duration,
      ease: easings.entrance,
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, from, duration, shouldReduce, triggerOnce]);

  const Tag = inline ? "span" : "div";
  return (
    <Tag ref={ref} className={cn("tabular-nums", className)}>
      {format(display)}
    </Tag>
  );
}
