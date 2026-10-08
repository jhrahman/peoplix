"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { NotificationGroup } from "@/lib/notification-text";
import type { AppNotification } from "@/lib/types";
import {
  deleteNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  markNotificationsUnread,
} from "@/components/notifications/notification-actions";

// The state and optimistic actions shared by the navbar dropdown and the
// /notifications page. `onUnreadDelta` lets the bell keep its server-side
// unread total in step (its list only holds the latest few).
export function useNotificationItems(
  initial: AppNotification[] | null,
  onUnreadDelta?: (delta: number) => void,
) {
  const [items, setItems] = useState(initial);

  const setReadAt = (ids: string[], readAt: string | null) =>
    setItems((prev) => prev?.map((i) => (ids.includes(i.id) ? { ...i, read_at: readAt } : i)) ?? prev);

  const unreadIds = (group: NotificationGroup) =>
    group.items.filter((i) => i.read_at === null).map((i) => i.id);

  // Clicking a row: it's being read now (and the link takes over from here).
  function open(group: NotificationGroup) {
    const ids = unreadIds(group);
    if (ids.length === 0) return;
    setReadAt(ids, new Date().toISOString());
    onUnreadDelta?.(-ids.length);
    markNotificationsRead(ids);
  }

  function toggleRead(group: NotificationGroup) {
    const ids = unreadIds(group);
    if (ids.length > 0) {
      open(group);
      return;
    }
    const all = group.items.map((i) => i.id);
    setReadAt(all, null);
    onUnreadDelta?.(all.length);
    markNotificationsUnread(all);
  }

  async function remove(group: NotificationGroup) {
    const all = group.items.map((i) => i.id);
    const unread = unreadIds(group).length;
    const previous = items;

    setItems((prev) => prev?.filter((i) => !all.includes(i.id)) ?? prev);
    onUnreadDelta?.(-unread);

    if (!(await deleteNotifications(all))) {
      setItems(previous);
      onUnreadDelta?.(unread);
      toast.error("Couldn't remove the notification");
    }
  }

  async function markAll() {
    if (!(await markAllNotificationsRead())) {
      toast.error("Couldn't mark notifications as read");
      return false;
    }
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((i) => ({ ...i, read_at: i.read_at ?? now })) ?? prev);
    return true;
  }

  return { items, setItems, open, toggleRead, remove, markAll };
}
