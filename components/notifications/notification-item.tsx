"use client";

import Link from "next/link";
import { AtSign, Award, Circle, CircleCheck, Gift, MessageCircle, SmilePlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  actorNames,
  describeGroup,
  notificationHref,
  type NotificationGroup,
} from "@/lib/notification-text";
import { cn, getInitials } from "@/lib/utils";
import { TimeAgo } from "@/components/engagement/time-ago";

// One row, shared by the navbar dropdown and the /notifications page. It's a
// real link to the tagged post, so it also works with middle-click / new tab.
// A group (several unread comments on one post) is one row that links to the
// newest comment and is read/removed as a unit.
export function NotificationItem({
  group,
  onOpen,
  onToggleRead,
  onRemove,
}: {
  group: NotificationGroup;
  onOpen: (group: NotificationGroup) => void;
  onToggleRead: (group: NotificationGroup) => void;
  onRemove: (group: NotificationGroup) => void;
}) {
  const n = group.latest;
  const unread = group.items.some((i) => i.read_at === null);
  const Icon = {
    kudos: Award,
    comment: MessageCircle,
    reaction: SmilePlus,
    wish: Gift,
    mention: AtSign,
  }[n.type];
  const name = actorNames(group.actors);

  return (
    <div className="group/row relative" data-testid={`notification-${n.id}`}>
      <Link
        href={notificationHref(n)}
        onClick={() => onOpen(group)}
        className={cn(
          "flex items-start gap-3 rounded-lg py-2.5 pr-3 pl-5 text-left transition-colors duration-150 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
          unread && "bg-primary/8",
        )}
      >
        <div className="relative shrink-0">
          <Avatar size="lg">
            <AvatarImage src={n.actor?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{getInitials(group.actors[0]?.full_name ?? "Someone")}</AvatarFallback>
          </Avatar>
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Icon className="size-3" />
          </span>
        </div>
        <div className="min-w-0 flex-1 pr-14">
          <p className="text-sm leading-snug">
            <span className="font-medium">{name}</span> {describeGroup(group)}
          </p>
          {n.preview && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.preview}</p>
          )}
          <TimeAgo
            iso={n.created_at}
            className={cn("mt-0.5 block text-xs", unread ? "font-medium text-primary" : "text-muted-foreground")}
          />
        </div>
      </Link>

      {unread && (
        <span
          className="pointer-events-none absolute top-1/2 left-2 size-2 -translate-y-1/2 rounded-full bg-primary"
          role="img"
          aria-label="Unread"
        />
      )}

      {/* Always visible on touch screens; revealed on hover/focus where hover exists. */}
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 transition-opacity duration-150 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onToggleRead(group)}
          aria-label={unread ? "Mark as read" : "Mark as unread"}
          title={unread ? "Mark as read" : "Mark as unread"}
          data-testid={`notification-toggle-${n.id}`}
        >
          {unread ? <CircleCheck /> : <Circle />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(group)}
          aria-label="Remove notification"
          title="Remove"
          data-testid={`notification-remove-${n.id}`}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
