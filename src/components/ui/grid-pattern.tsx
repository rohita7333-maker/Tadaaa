import { cn } from "@/lib/utils";

interface GridPatternProps {
  /** Cell size in px (default 60) */
  cellSize?: number;
  /** Stroke color (default cream-deep) */
  strokeColor?: string;
  /** Opacity (default 0.5) */
  opacity?: number;
  /** Radial mask intensity — controls fade-out edges (default "ellipse_80%_50%_at_50%_0%") */
  maskShape?: string;
  /** Variant: "grid" (default) or "dots" */
  variant?: "grid" | "dots";
  className?: string;
}

/**
 * Subtle grid/dot background pattern with radial fade mask.
 * Used as decorative background layer on hero, auth, and pricing pages.
 *
 * Pure CSS — no JS, no motion. Brand-aware: default stroke = cream-deep.
 */
export function GridPattern({
  cellSize = 60,
  strokeColor = "#E8D9C9",
  opacity = 0.5,
  maskShape = "ellipse 80% 50% at 50% 0%",
  variant = "grid",
  className,
}: GridPatternProps) {
  const gridBg =
    variant === "grid"
      ? `linear-gradient(to right, ${strokeColor} 1px, transparent 1px), linear-gradient(to bottom, ${strokeColor} 1px, transparent 1px)`
      : `radial-gradient(${strokeColor} 1px, transparent 1px)`;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
      style={{
        backgroundImage: gridBg,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        opacity,
        maskImage: `radial-gradient(${maskShape}, black 60%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(${maskShape}, black 60%, transparent 100%)`,
      }}
    />
  );
}
