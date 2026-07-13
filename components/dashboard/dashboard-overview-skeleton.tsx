import { StatTileSkeleton } from "@/components/dashboard/stat-tile-skeleton";

export function DashboardOverviewSkeleton() {
  return (
    <>
      <StatTileSkeleton count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-panel h-56 animate-pulse rounded-lg" />
        <div className="glass-panel h-56 animate-pulse rounded-lg" />
      </div>
      <div className="glass-panel h-64 animate-pulse rounded-lg" />
      <div className="glass-panel h-40 animate-pulse rounded-lg" />
    </>
  );
}
