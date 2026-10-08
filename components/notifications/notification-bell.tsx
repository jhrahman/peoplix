"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  describeNotification,
  groupNotifications,
} from "@/lib/notification-text";
import type { AppNotification } from "@/lib/types";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotificationItems } from "@/components/notifications/use-notification-items";

const POLL_MS = 60_000;
const DROPDOWN_ITEMS = 8;

async function fetchUnreadCount(): Promise<number | null> {
  const res = await fetch("/api/notifications/unread-count").catch(() => null);
  if (!res?.ok) return null;
  const json = await res.json().catch(() => null);
  return typeof json?.data?.count === "number" ? json.data.count : null;
}

async function fetchLatest(): Promise<AppNotification | null> {
  const res = await fetch("/api/notifications?limit=1").catch(() => null);
  if (!res?.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data?.[0] ?? null;
}

// The Facebook-style hint: a bell with an unread count, a dropdown of the
// latest few, and a toast when something new arrives while you're here. The
// count is polled once a minute while the tab is visible (and on focus) rather
// than held open with Realtime - far fewer moving parts and connections for
// the free tier, at the cost of up to a minute of delay.
export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // The last count we saw, to tell "new notification arrived" from "first load".
  const lastCount = useRef<number | null>(null);

  const list = useNotificationItems(null, (delta) => setUnread((c) => Math.max(0, c + delta)));
  const { items, setItems } = list;
  const groups = useMemo(() => groupNotifications(items ?? []), [items]);

  const loadItems = useCallback(async () => {
    const res = await fetch(`/api/notifications?limit=${DROPDOWN_ITEMS}`).catch(() => null);
    if (!res?.ok) return;
    const json = await res.json().catch(() => null);
    if (json?.data) {
      setItems(json.data);
      setUnread(json.unread_count);
      lastCount.current = json.unread_count;
      setLoaded(true);
    }
  }, [setItems]);

  useEffect(() => {
    const sync = () =>
      fetchUnreadCount().then(async (count) => {
        if (count === null) return;

        const previous = lastCount.current;
        lastCount.current = count;
        setUnread(count);

        // Something new landed while they're looking at the app: say who and what.
        if (previous !== null && count > previous && document.visibilityState === "visible") {
          const latest = await fetchLatest();
          if (latest) {
            toast(`${latest.actor?.full_name ?? "Someone"} ${describeNotification(latest)}`, {
              description: latest.preview || undefined,
              action: { label: "View", onClick: () => router.push("/notifications") },
            });
          }
        }
      });

    sync();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, POLL_MS);

    window.addEventListener("focus", sync);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", sync);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, sync);
    };
  }, [router]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadItems();
  }

  async function handleMarkAll() {
    if (await list.markAll()) setUnread(0);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          data-testid="notification-bell"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-semibold text-white tabular-nums ring-2 ring-background"
              data-testid="notification-badge"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-medium">Notifications</h2>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
              data-testid="notification-mark-all"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-1.5">
          {!loaded ? (
            <div className="space-y-2 p-2" aria-label="Loading notifications">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/70" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Bell className="size-6 text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up. You&apos;ll see it here when someone tags you or comments on
                your post.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <NotificationItem
                key={group.key}
                group={group}
                onOpen={(g) => {
                  setOpen(false);
                  list.open(g);
                }}
                onToggleRead={list.toggleRead}
                onRemove={list.remove}
              />
            ))
          )}
        </div>

        <div className="border-t border-border p-1.5">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-lg py-2 text-center text-sm font-medium text-primary transition-colors duration-150 hover:bg-muted"
            data-testid="notification-see-all"
          >
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
