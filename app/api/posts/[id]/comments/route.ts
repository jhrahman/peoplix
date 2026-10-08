import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import {
  COMMENT_MAX_LENGTH,
  COMMENT_SELECT,
  toComment,
  type CommentRow,
} from "@/lib/engagement";
import { validateMentions, visibleLength } from "@/lib/mentions";
import { mentionedIds, notify, postContext } from "@/lib/notifications";
import { auditEngagement, commentSummary, postNoun, whose } from "@/lib/engagement-audit";
import { mediaColumns, mediaLabel, validateCommentMedia } from "@/lib/comment-media";
import { removeCommentMediaObjects } from "@/lib/engagement-storage";
import type { PostKind } from "@/lib/types";

// A thread is loaded in one go when it's opened; this cap just keeps a
// runaway thread from turning into an unbounded response.
const MAX_COMMENTS = 200;

export async function GET(
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

  const { data, error } = await supabase
    .from("post_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .order("created_at", { referencedTable: "comment_reactions", ascending: true })
    .limit(MAX_COMMENTS)
    .returns<CommentRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []).map((row) => toComment(row, user.id)) });
}

export async function POST(
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

  const allowed = await checkRateLimit(`comment-create:${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const mediaCheck = validateCommentMedia(body?.media, user.id);

  if (!mediaCheck.ok) {
    return NextResponse.json({ error: mediaCheck.error }, { status: 400 });
  }
  const media = mediaCheck.media;

  // Whatever goes wrong from here, a photo or clip the browser already uploaded
  // for this comment is an orphan if the comment isn't created - remove it.
  const fail = async (error: string, status: number) => {
    if (media && media.kind !== "gif") {
      await removeCommentMediaObjects([{ media_kind: media.kind, media_path: media.path }]);
    }
    return NextResponse.json({ error }, { status });
  };

  // A comment can be just a GIF, photo or video; it needs text only when it has none.
  if (!content && !media) {
    return fail("Write something or add a GIF, photo or video", 400);
  }

  if (visibleLength(content) > COMMENT_MAX_LENGTH) {
    return fail(`Comments are limited to ${COMMENT_MAX_LENGTH} characters`, 400);
  }

  const mentionError = await validateMentions(supabase, content);
  if (mentionError) {
    return fail(mentionError, 400);
  }

  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: id, author_id: user.id, content, ...mediaColumns(media) })
    .select(COMMENT_SELECT)
    .single<CommentRow>();

  if (error) {
    // 23503 = the post was deleted while its thread was open; 22P02 = not a uuid.
    if (error.code === "23503" || error.code === "22P02") {
      return fail("Post not found", 404);
    }
    return fail(error.message, 400);
  }

  // Notify the post's author about the comment - unless it's their own
  // comment, or they're tagged in it (then they get the more specific
  // "tagged you in a comment" instead of two alerts), plus anyone tagged.
  const { data: post } = await supabase
    .from("posts")
    .select("author_id, kind, is_announcement, author:profiles!posts_author_id_fkey(full_name)")
    .eq("id", id)
    .single<{
      author_id: string;
      kind: PostKind;
      is_announcement: boolean;
      author: { full_name: string } | null;
    }>();
  const tagged = mentionedIds(content);

  await notify({
    actorId: user.id,
    postId: id,
    commentId: data.id,
    // An attachment-only comment still needs something to show in the bell.
    content: content || `Sent ${mediaLabel(media)}`,
    recipients: [
      ...(post && post.author_id !== user.id && !tagged.includes(post.author_id)
        ? [{ recipientId: post.author_id, type: "comment" as const, context: postContext(post) }]
        : []),
      ...tagged.map((recipientId) => ({
        recipientId,
        type: "mention" as const,
        context: "comment" as const,
      })),
    ],
  });

  await auditEngagement(supabase, user.id, {
    action: "create",
    entity: "comment",
    comment: post
      ? `Commented on ${whose(post.author_id, post.author?.full_name, user.id)} ${postNoun(post)}: ${commentSummary(content, media)}`
      : `Commented: ${commentSummary(content, media)}`,
  });

  return NextResponse.json({ data: toComment(data, user.id) }, { status: 201 });
}
