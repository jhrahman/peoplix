import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center">
      <div className="relative flex flex-col items-center gap-3">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/25 blur-2xl" />
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
