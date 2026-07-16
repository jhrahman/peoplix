import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  sublabel,
  accent = false,
  tone = "default",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
  tone?: "default" | "orange";
  href?: string;
}) {
  const slug = label.trim().toLowerCase().replace(/\s+/g, "-");

  const card = (
    <Card
      className={cn(
        "glass-interactive relative overflow-hidden",
        tone === "orange" && "border-orange-500/30",
        href && "cursor-pointer",
      )}
      data-testid={`stat-tile-${slug}`}
    >
      {tone === "orange" && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-400/10 to-transparent dark:from-orange-400/25 dark:via-amber-300/10" />
      )}
      <CardContent className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "orange"
              ? "bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-sm"
              : accent
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
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

  if (!href) return card;

  return (
    <Link href={href} className="block" data-testid={`stat-tile-${slug}-link`}>
      {card}
    </Link>
  );
}
