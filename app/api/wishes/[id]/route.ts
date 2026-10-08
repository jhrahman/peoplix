import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { auditEngagement, quoted } from "@/lib/engagement-audit";
import type { Occasion } from "@/lib/wish-constants";

// Take back your own wish; an Admin can remove anyone's (moderation). Checked
// here from the session and again by the delete policy in 0017.
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
  const profile = await getProfileById(supabase, user.id);

  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("celebration_wishes")
    .select(
      "sender_id, occasion, message, sender:profiles!celebration_wishes_sender_id_fkey(full_name), recipient:profiles!celebration_wishes_recipient_id_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle<{
      sender_id: string;
      occasion: Occasion;
      message: string;
      sender: { full_name: string } | null;
      recipient: { full_name: string } | null;
    }>();

  if (fetchError?.code === "22P02") {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }

  const isOwn = existing.sender_id === user.id;
  if (!isOwn && profile.role !== "admin") {
    return NextResponse.json({ error: "You can only remove your own wishes" }, { status: 403 });
  }

  const { error, count } = await supabase
    .from("celebration_wishes")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  }

  // Every removal is recorded: your own, and (Admin) someone else's.
  const to = existing.recipient?.full_name ?? "a colleague";
  const kind =
    existing.occasion === "birthday"
      ? "birthday"
      : existing.occasion === "new_joiner"
        ? "welcome"
        : "work anniversary";
  await auditEngagement(supabase, user.id, {
    action: "delete",
    entity: "wish",
    comment: isOwn
      ? `Removed their ${kind} wish to ${to}: ${quoted(existing.message)}`
      : `Deleted ${existing.sender?.full_name ?? "an employee"}'s ${kind} wish to ${to}: ${quoted(existing.message)}`,
  });

  return NextResponse.json({ data: { id } });
}
