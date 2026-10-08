import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { getProfileById } from "@/lib/auth/get-profile";
import { MAX_PINNED_ANNOUNCEMENTS } from "@/lib/engagement";
import { removeCommentMediaObjects, removeMediaObjects } from "@/lib/engagement-storage";
import { auditEngagement, postNoun, quoted, whose } from "@/lib/engagement-audit";
import type { MediaKind, PostKind } from "@/lib/types";

// Pin or unpin an announcement. Admin/HR only - re-checked from the session
// here, and again by the column-level grant + policy in 0014_engagement_v2.sql.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.is_pinned !== "boolean") {
    return NextResponse.json({ error: "is_pinned must be true or false" }, { status: 400 });
  }

  const { data: existing } = await auth.supabase
    .from("posts")
    .select("is_announcement, is_pinned, content")
    .eq("id", id)
    .single<{ is_announcement: boolean; is_pinned: boolean; content: string }>();

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (!existing.is_announcement) {
    return NextResponse.json({ error: "Only announcements can be pinned" }, { status: 400 });
  }

  if (body.is_pinned && !existing.is_pinned) {
    const { count } = await auth.supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_pinned", true);

    if ((count ?? 0) >= MAX_PINNED_ANNOUNCEMENTS) {
      return NextResponse.json(
        { error: `You can pin up to ${MAX_PINNED_ANNOUNCEMENTS} announcements. Unpin one first.` },
        { status: 400 },
      );
    }
  }

  const { error } = await auth.supabase
    .from("posts")
    .update({ is_pinned: body.is_pinned })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (existing.is_pinned !== body.is_pinned) {
    await auditEngagement(auth.supabase, auth.user.id, {
      action: "update",
      entity: "post",
      comment: `${body.is_pinned ? "Pinned" : "Unpinned"} an announcement: ${quoted(existing.content)}`,
    });
  }

  return NextResponse.json({ data: { id, is_pinned: body.is_pinned } });
}

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

  const { data: existing } = await supabase
    .from("posts")
    .select(
      "author_id, content, kind, is_announcement, author:profiles!posts_author_id_fkey(full_name), post_media(kind, path)",
    )
    .eq("id", id)
    .single<{
      author_id: string;
      content: string;
      kind: PostKind;
      is_announcement: boolean;
      author: { full_name: string } | null;
      post_media: { kind: MediaKind; path: string }[];
    }>();

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Own posts only, unless the caller is Admin - checked from the session
  // here, and again by the delete policy (0013_engagement.sql).
  const isOwn = existing.author_id === user.id;
  if (!isOwn && profile.role !== "admin") {
    return NextResponse.json(
      { error: "You can only delete your own posts" },
      { status: 403 },
    );
  }

  // The comments go with the post, and so would be lost track of: note which of
  // them carry a photo or clip so the files can be removed too.
  const { data: commentFiles } = await supabase
    .from("post_comments")
    .select("media_kind, media_path")
    .eq("post_id", id)
    .not("media_kind", "is", null)
    .returns<{ media_kind: string | null; media_path: string | null }[]>();

  // Comments, reactions, poll data and media rows go with it (on delete cascade).
  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // The cascade only removes the rows; the uploaded files need deleting too.
  await removeMediaObjects(existing.post_media);
  await removeCommentMediaObjects(commentFiles ?? []);

  // Every delete is recorded: your own, and (Admin) someone else's.
  await auditEngagement(supabase, user.id, {
    action: "delete",
    entity: "post",
    comment: `Deleted ${whose(existing.author_id, existing.author?.full_name, user.id)} ${postNoun(existing)}: ${quoted(existing.content)}`,
  });

  return NextResponse.json({ data: { id } });
}
