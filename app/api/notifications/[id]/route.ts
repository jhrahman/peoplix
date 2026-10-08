import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RLS means every query here is limited to the caller's own notifications, so
// someone else's id simply matches nothing.

// Marks one notification read (default) or, with { "read": false }, unread.
// Doing either to a notification already in that state is still a success.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const markUnread = body?.read === false;

  const query = supabase
    .from("notifications")
    .update({ read_at: markUnread ? null : new Date().toISOString() })
    .eq("id", id);

  const { error } = await (markUnread ? query : query.is("read_at", null));

  if (error) {
    // 22P02 = not a uuid.
    if (error.code === "22P02") {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id, read: !markUnread } });
}

// Removes a notification from the caller's own list.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    if (error.code === "22P02") {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id } });
}
