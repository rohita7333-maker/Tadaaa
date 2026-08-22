import { InviteCardSkeleton, StatTileSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    // Shapes match the loaded layout: `.ed-phead`, `.ed-stats`, then rows
    // inside the surprises panel — so nothing shifts when the data arrives.
    <div>
      <div className="ed-phead">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-[6px] bg-pebble animate-shimmer" />
          <div className="h-4 w-32 rounded-[6px] bg-pebble animate-shimmer" />
        </div>
      </div>

      <div className="ed-stats">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>

      <div className="ed-gr2">
        <div className="ed-panel">
          <div className="h-5 w-40 rounded-[6px] bg-pebble animate-shimmer mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <InviteCardSkeleton key={i} />
          ))}
        </div>
        <div className="ed-panel">
          <div className="h-5 w-24 rounded-[6px] bg-pebble animate-shimmer mb-4" />
          <div className="h-4 w-full rounded-[6px] bg-pebble animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
