"use client";

import { Gift, PartyPopper } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Celebration } from "@/lib/celebrations";
import { cn, getInitials } from "@/lib/utils";

function when(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return `${-days} days ago`;
}

function describe(c: Celebration, isSelf: boolean) {
  switch (c.kind) {
    case "birthday":
      return isSelf && c.days === 0 ? "It's your birthday! 🎉" : `Birthday · ${when(c.days)}`;
    case "milestone":
      return `${c.years}-year work anniversary · ${when(c.days)}`;
    case "anniversary":
      return `${c.years}-year work anniversary · ${when(c.days)}`;
    case "new_joiner":
      return c.days === 0 ? "Joined today" : c.days === 1 ? "Joined yesterday" : `Joined ${c.days} days ago`;
  }
}

const EMOJI = { birthday: "🎂", milestone: "🏆", anniversary: "🎊", new_joiner: "👋" } as const;

// Derived from profiles.joined_date and the (private) birthdays people chose
// to share, so nobody enters anything twice. Every celebration - birthdays,
// work anniversaries of any year, and new joiners - has a card the team can
// sign, comment on and react to. It opens on the day (new joiners: when they
// join) and stays open for a few days; upcoming ones show when they open.
export function CelebrationsCard({
  celebrations,
  currentUserId,
  limit,
  onOpenWish,
  className,
}: {
  celebrations: Celebration[];
  currentUserId: string;
  limit: number;
  onOpenWish: (celebration: Celebration) => void;
  className?: string;
}) {
  if (celebrations.length === 0) return null;

  const shown = celebrations.slice(0, limit);

  return (
    <Card size="sm" className={className} data-testid="celebrations-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="size-4 text-primary" />
          Celebrations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {shown.map((c) => {
            const isSelf = c.id === currentUserId;
            const upcoming = !c.canWish;
            const verb = c.kind === "new_joiner" ? "Welcome" : c.kind === "birthday" ? "Wish" : "Congratulate";

            return (
              <li
                key={c.key}
                data-testid={`celebration-${c.key}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg",
                  isSelf && c.canWish && "bg-primary/10 p-2 -mx-2",
                )}
              >
                <Avatar>
                  <AvatarImage src={c.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{getInitials(c.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {isSelf ? `${c.full_name} (you)` : c.full_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span aria-hidden>{EMOJI[c.kind]} </span>
                    {describe(c, isSelf)}
                  </p>
                  {c.wishCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenWish(c)}
                      className="mt-0.5 cursor-pointer text-xs font-medium text-primary hover:underline"
                      data-testid={`celebration-wishes-${c.key}`}
                    >
                      {c.wishCount} {c.wishCount === 1 ? "wish" : "wishes"}
                    </button>
                  )}
                </div>

                {!isSelf && c.canWish && !c.iWished && (
                  <Button
                    size="sm"
                    onClick={() => onOpenWish(c)}
                    data-testid={`celebration-wish-${c.key}`}
                  >
                    <Gift />
                    {c.days < 0 && c.kind !== "new_joiner" ? `Belated ${verb.toLowerCase()}` : verb}
                  </Button>
                )}
                {!isSelf && c.iWished && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenWish(c)}
                    className="text-primary"
                    data-testid={`celebration-wished-${c.key}`}
                  >
                    Wished ✓
                  </Button>
                )}
                {upcoming && (
                  <span className="shrink-0 text-xs text-muted-foreground" data-testid={`celebration-opens-${c.key}`}>
                    Opens on the day
                  </span>
                )}
                {isSelf && c.canWish && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenWish(c)}
                    data-testid={`celebration-view-${c.key}`}
                  >
                    View wishes
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {celebrations.length > shown.length && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            +{celebrations.length - shown.length} more
          </p>
        )}
      </CardContent>
    </Card>
  );
}
