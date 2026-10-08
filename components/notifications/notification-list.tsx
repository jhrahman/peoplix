"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupNotifications } from "@/lib/notification-text";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotificationItems } from "@/components/notifications/use-notification-items";

type Tab = "all" | "unread";

export function NotificationList({
  initial,
  initialHasMore,
}: {
  initial: AppNotification[];
  initialHasMore: boolean;
}) {
  const list = useNotificationItems(initial);
  const items = list.items;
  const groups = useMemo(() => groupNotifications(items ?? []), [items]);

  const [tab, setTab] = useState<Tab>("all");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const unread = (items ?? []).filter((n) => n.read_at === null).length;
  const path = (extra: string) => `/api/notifications?${tab === "unread" ? "unread=1&" : ""}${extra}`;

  async function switchTab(next: Tab) {
    if (next === tab || loading) return;
    setTab(next);
    setLoading(true);
    const res = await fetch(`/api/notifications?${next === "unread" ? "unread=1" : ""}`).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setLoading(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't load notifications");
      setTab(tab);
      return;
    }
    list.setItems(json.data);
    setHasMore(json.has_more);
  }

  async function loadMore() {
    const last = items?.[items.length - 1];
    if (!last || loading) return;

    setLoading(true);
    const res = await fetch(path(`before=${encodeURIComponent(last.created_at)}`)).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setLoading(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't load more");
      return;
    }
    list.setItems((prev) => [...(prev ?? []), ...json.data]);
    setHasMore(json.has_more);
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
  ];

  return (
    <div className="space-y-3" data-testid="notifications-list">
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter notifications" className="flex gap-1">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => switchTab(value)}
              data-testid={`notifications-tab-${value}`}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === value
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
              {value === "unread" && unread > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[0.7rem] leading-5 text-primary-foreground tabular-nums">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={list.markAll} data-testid="notifications-mark-all">
            <CheckCheck />
            Mark all as read
          </Button>
        )}
      </div>

      {loading && groups.length === 0 ? (
        <div className="space-y-2" aria-label="Loading notifications">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center"
          data-testid="notifications-empty"
        >
          <Bell className="size-7 text-muted-foreground/70" />
          <p className="font-medium">You&apos;re all caught up</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll see it here when someone tags you, gives you kudos, or comments on your post.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => (
            <NotificationItem
              key={group.key}
              group={group}
              onOpen={list.open}
              onToggleRead={list.toggleRead}
              onRemove={list.remove}
            />
          ))}
        </div>
      )}

      {hasMore && groups.length > 0 && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" onClick={loadMore} disabled={loading} data-testid="notifications-load-more">
            {loading ? "Loading..." : "Show older"}
          </Button>
        </div>
      )}
    </div>
  );
}
