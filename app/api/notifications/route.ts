import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_PAGE_SIZE, fetchNotifications } from "@/lib/notifications";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(requested) && requested > 0
      ? Math.min(requested, 50)
      : NOTIFICATIONS_PAGE_SIZE;

  // RLS already limits every query here to the caller's own notifications.
  const [{ notifications, hasMore, error }, { count }] = await Promise.all([
    fetchNotifications(supabase, {
      before: searchParams.get("before"),
      limit,
      unreadOnly: searchParams.get("unread") === "1",
    }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data: notifications, has_more: hasMore, unread_count: count ?? 0 });
}
