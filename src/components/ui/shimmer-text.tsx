import { cn } from "@/lib/utils";

interface ShimmerTextProps {
  /** Text content to apply gradient shimmer to */
  children: React.ReactNode;
  /** Render as inline-block (default true) */
  inline?: boolean;
  className?: string;
}

/**
 * Animated gradient sweep on text — uses brand rose→gold→rose gradient.
 * Driven by `shimmer-text-gradient` class in globals.css.
 * Respects prefers-reduced-motion (animation pauses, gradient still visible).
 *
 * Use sparingly — best on 1-3 accent words in a headline.
 */
export function ShimmerText({ children, inline = true, className }: ShimmerTextProps) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={cn("shimmer-text-gradient font-semibold", className)}>
      {children}
    </Tag>
  );
}
