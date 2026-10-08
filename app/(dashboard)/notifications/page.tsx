import { getCurrentProfile } from "@/lib/auth/get-profile";
import { fetchNotifications } from "@/lib/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage() {
  const { supabase, user } = await getCurrentProfile();

  // The dashboard layout redirects to /login in this case.
  if (!user) return null;

  // Deliberately uncached: an unread dot that lags behind reality reads as broken.
  const { notifications, hasMore } = await fetchNotifications(supabase);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <NotificationList initial={notifications} initialHasMore={hasMore} />
      </CardContent>
    </Card>
  );
}
