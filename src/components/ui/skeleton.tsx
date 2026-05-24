import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override base classes (still merges with shimmer + rounded) */
  className?: string;
}

/**
 * Shimmer skeleton placeholder for loading states.
 * Uses brand-aware gradient (cream/rose-glow) via globals.css `.animate-shimmer`.
 * Respects prefers-reduced-motion (animation collapses to static cream).
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-[#F0E5D8]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Invite card skeleton — matches InviteCard shape so layout doesn't shift on load. */
export function InviteCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-[#D4CBC3]/20 overflow-hidden"
      style={{
        boxShadow: "0 2px 4px rgba(45,41,38,0.04), 0 8px 24px rgba(45,41,38,0.08)",
      }}
    >
      <Skeleton className="h-28 rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Stat tile skeleton — for dashboard hero stats. */
export function StatTileSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#D4CBC3]/30 p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
