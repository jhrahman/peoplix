export function StatTileSkeleton({
  count,
  className = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass-panel h-24 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
