import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-text";

// Tells every mounted bell/list that counts changed, so e.g. reading items on
// the /notifications page updates the navbar badge without waiting for a poll.
function announceChange() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

async function eachOk(requests: Promise<Response | null>[]) {
  const results = await Promise.all(requests);
  announceChange();
  return results.every((res) => res?.ok);
}

// keepalive: marking read usually fires as a click navigates away, and the
// request must still complete after the page unloads.
export function markNotificationsRead(ids: string[]) {
  return eachOk(
    ids.map((id) => fetch(`/api/notifications/${id}`, { method: "PATCH", keepalive: true }).catch(() => null)),
  );
}

export function markNotificationsUnread(ids: string[]) {
  return eachOk(
    ids.map((id) =>
      fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: false }),
      }).catch(() => null),
    ),
  );
}

export function deleteNotifications(ids: string[]) {
  return eachOk(ids.map((id) => fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => null)));
}

export async function markAllNotificationsRead() {
  const res = await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => null);
  announceChange();
  return Boolean(res?.ok);
}
