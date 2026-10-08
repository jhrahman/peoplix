import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { auditEngagement, commentSummary, whose } from "@/lib/engagement-audit";
import { removeCommentMediaObjects } from "@/lib/engagement-storage";
import { CARD_NOUN, type Occasion } from "@/lib/wish-constants";

// Delete your own comment on a card; an Admin can delete anyone's (checked here
// and again by the delete policy in 0018).
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
    .from("celebration_comments")
    .select(
      "author_id, recipient_id, occasion, content, media_kind, media_path, author:profiles!celebration_comments_author_id_fkey(full_name), recipient:profiles!celebration_comments_recipient_id_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle<{
      author_id: string;
      recipient_id: string;
      occasion: Occasion;
      content: string;
      media_kind: "image" | "video" | "gif" | null;
      media_path: string | null;
      author: { full_name: string } | null;
      recipient: { full_name: string } | null;
    }>();

  if (fetchError?.code === "22P02" || !existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const isOwn = existing.author_id === user.id;
  if (!isOwn && profile.role !== "admin") {
    return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
  }

  const { error, count } = await supabase
    .from("celebration_comments")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  await removeCommentMediaObjects([existing]);

  await auditEngagement(supabase, user.id, {
    action: "delete",
    entity: "wish",
    comment: `Deleted ${whose(existing.author_id, existing.author?.full_name, user.id)} comment on ${whose(existing.recipient_id, existing.recipient?.full_name, user.id)} ${CARD_NOUN[existing.occasion]}: ${commentSummary(existing.content, existing.media_kind ? { kind: existing.media_kind } : null)}`,
  });

  return NextResponse.json({ data: { id } });
}
