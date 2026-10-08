import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { auditEngagement, commentSummary, postNoun, whose } from "@/lib/engagement-audit";
import { removeCommentMediaObjects } from "@/lib/engagement-storage";
import type { PostKind } from "@/lib/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, commentId } = await params;

  const profile = await getProfileById(supabase, user.id);

  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("post_comments")
    .select(
      "author_id, content, media_kind, media_path, author:profiles!post_comments_author_id_fkey(full_name), post:posts!post_comments_post_id_fkey(author_id, kind, is_announcement, author:profiles!posts_author_id_fkey(full_name))",
    )
    .eq("id", commentId)
    .eq("post_id", id)
    .single<{
      author_id: string;
      content: string;
      media_kind: "image" | "video" | "gif" | null;
      media_path: string | null;
      author: { full_name: string } | null;
      post: {
        author_id: string;
        kind: PostKind;
        is_announcement: boolean;
        author: { full_name: string } | null;
      } | null;
    }>();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Own comments only, unless the caller is Admin - checked from the session
  // here, and again by the delete policy (0013_engagement.sql).
  const isOwn = existing.author_id === user.id;
  if (!isOwn && profile.role !== "admin") {
    return NextResponse.json(
      { error: "You can only delete your own comments" },
      { status: 403 },
    );
  }

  const { error, count } = await supabase
    .from("post_comments")
    .delete({ count: "exact" })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // The row is gone; so should its photo or clip be.
  await removeCommentMediaObjects([existing]);

  // Every delete is recorded: your own, and (Admin) someone else's.
  const on = existing.post
    ? ` on ${whose(existing.post.author_id, existing.post.author?.full_name, user.id)} ${postNoun(existing.post)}`
    : "";
  await auditEngagement(supabase, user.id, {
    action: "delete",
    entity: "comment",
    comment: `Deleted ${whose(existing.author_id, existing.author?.full_name, user.id)} comment${on}: ${commentSummary(existing.content, existing.media_kind ? { kind: existing.media_kind } : null)}`,
  });

  return NextResponse.json({ data: { id: commentId } });
}
