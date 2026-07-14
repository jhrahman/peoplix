import { StatTileSkeleton } from "@/components/dashboard/stat-tile-skeleton";

export function DashboardOverviewSkeleton({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <>
      <StatTileSkeleton
        count={isAdmin ? 5 : 4}
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-panel h-56 animate-pulse rounded-lg" />
        <div className="glass-panel h-56 animate-pulse rounded-lg" />
      </div>
      <div className="glass-panel h-64 animate-pulse rounded-lg" />
      <div className="glass-panel h-40 animate-pulse rounded-lg" />
    </>
  );
}
