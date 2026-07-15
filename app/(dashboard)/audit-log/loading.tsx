import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditLogLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="h-9 w-full animate-pulse rounded-md bg-muted/60 sm:max-w-xs" />
          <div className="h-9 w-[9.5rem] animate-pulse rounded-md bg-muted/60" />
          <div className="h-9 w-[9.5rem] animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
