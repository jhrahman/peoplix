import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  sublabel,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}) {
  const slug = label.trim().toLowerCase().replace(/\s+/g, "-");

  return (
    <Card className="glass-interactive" data-testid={`stat-tile-${slug}`}>
      <CardContent className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-semibold leading-tight" data-testid={`stat-tile-${slug}-value`}>
            {value}
          </p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
