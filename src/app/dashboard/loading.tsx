import { InviteCardSkeleton, StatTileSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header placeholder */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-xl bg-[#ECE9E2] animate-shimmer" />
          <div className="h-4 w-32 rounded-md bg-[#ECE9E2] animate-shimmer" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>

      {/* Invite grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <InviteCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
