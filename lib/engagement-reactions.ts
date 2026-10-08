import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmoji } from "@/lib/engagement";
import { auditEngagement, postNoun, whose } from "@/lib/engagement-audit";
import { notify, postContext, retractReactionNotification } from "@/lib/notifications";
import type { PostKind } from "@/lib/types";

type ReactionTarget = {
  table: "post_reactions" | "comment_reactions";
  idColumn: "post_id" | "comment_id";
  id: string;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

// What a reaction was put on: enough to word the notification and the Audit
// Log message ("Reacted 👍 to Jane Doe's post").
type TargetInfo = {
  authorId: string;
  authorName: string | null;
  content: string;
  postId: string;
  // "post", "poll", "comment"... as it reads in "to <whose> <noun>".
  noun: string;
  // For notifications: the kind of post (or "comment" when reacting to one).
  context: ReturnType<typeof postContext> | "comment";
};

async function loadTarget(supabase: Supabase, target: ReactionTarget): Promise<TargetInfo | null> {
  if (target.table === "post_reactions") {
    const { data } = await supabase
      .from("posts")
      .select("author_id, kind, is_announcement, content, author:profiles!posts_author_id_fkey(full_name)")
      .eq("id", target.id)
      .maybeSingle<{
        author_id: string;
        kind: PostKind;
        is_announcement: boolean;
        content: string;
        author: { full_name: string } | null;
      }>();

    return data
      ? {
          authorId: data.author_id,
          authorName: data.author?.full_name ?? null,
          content: data.content,
          postId: target.id,
          noun: postNoun(data),
          context: postContext(data),
        }
      : null;
  }

  const { data } = await supabase
    .from("post_comments")
    .select("author_id, post_id, content, author:profiles!post_comments_author_id_fkey(full_name)")
    .eq("id", target.id)
    .maybeSingle<{
      author_id: string;
      post_id: string;
      content: string;
      author: { full_name: string } | null;
    }>();

  return data
    ? {
        authorId: data.author_id,
        authorName: data.author?.full_name ?? null,
        content: data.content,
        postId: data.post_id,
        noun: "comment",
        context: "comment",
      }
    : null;
}

// Shared by the four reaction endpoints (post/comment x add/remove) - the
// only difference between them is which table and id column they touch.
// Reactions are strictly self-service: the user_id is always the session's.
export async function addReaction(request: Request, target: ReactionTarget) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!isAllowedEmoji(body?.emoji)) {
    return NextResponse.json({ error: "Unknown emoji" }, { status: 400 });
  }

  const info = await loadTarget(supabase, target).catch(() => null);
  if (!info) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reacting with an emoji you already used is a no-op success, so a double tap
  // or a retry never errors - and never logs or notifies a second time.
  const { data: existing } = await supabase
    .from(target.table)
    .select("emoji")
    .eq(target.idColumn, target.id)
    .eq("user_id", user.id)
    .eq("emoji", body.emoji)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ data: { emoji: body.emoji } });
  }

  const { error } = await supabase
    .from(target.table)
    .insert({ [target.idColumn]: target.id, user_id: user.id, emoji: body.emoji });

  if (error) {
    // 23503 = deleted in the meantime; 22P02 = not a uuid; 23505 = lost a race with ourselves.
    if (error.code === "23505") {
      return NextResponse.json({ data: { emoji: body.emoji } });
    }
    if (error.code === "23503" || error.code === "22P02") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Tell the author of the post or comment - but not when it's their own.
  // (Repeat reactions from the same person collapse inside notify().)
  await notify({
    actorId: user.id,
    postId: info.postId,
    commentId: target.table === "comment_reactions" ? target.id : undefined,
    content: info.content,
    recipients: [
      { recipientId: info.authorId, type: "reaction", context: info.context, emoji: body.emoji },
    ],
  });

  await auditEngagement(supabase, user.id, {
    action: "create",
    entity: target.table === "post_reactions" ? "post" : "comment",
    comment: `Reacted ${body.emoji} to ${whose(info.authorId, info.authorName, user.id)} ${info.noun}`,
  });

  return NextResponse.json({ data: { emoji: body.emoji } });
}

export async function removeReaction(request: Request, target: ReactionTarget) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emoji = new URL(request.url).searchParams.get("emoji");

  if (!isAllowedEmoji(emoji)) {
    return NextResponse.json({ error: "Unknown emoji" }, { status: 400 });
  }

  // Removing a reaction that isn't there is still a success - the end state
  // ("I haven't reacted with this") is what the caller asked for.
  const { error, count } = await supabase
    .from(target.table)
    .delete({ count: "exact" })
    .eq(target.idColumn, target.id)
    .eq("user_id", user.id)
    .eq("emoji", emoji);

  if (error) {
    if (error.code === "22P02") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Nothing was actually removed: nothing to withdraw and nothing to log.
  if (!count) {
    return NextResponse.json({ data: { emoji } });
  }

  // If that was their last reaction on this thing, withdraw the unread alert.
  const { count: remaining } = await supabase
    .from(target.table)
    .select("emoji", { count: "exact", head: true })
    .eq(target.idColumn, target.id)
    .eq("user_id", user.id);

  if (!remaining) {
    await retractReactionNotification(
      target.table === "post_reactions"
        ? { actorId: user.id, postId: target.id }
        : { actorId: user.id, commentId: target.id },
    );
  }

  const info = await loadTarget(supabase, target).catch(() => null);
  await auditEngagement(supabase, user.id, {
    action: "delete",
    entity: target.table === "post_reactions" ? "post" : "comment",
    comment: info
      ? `Removed their ${emoji} reaction from ${whose(info.authorId, info.authorName, user.id)} ${info.noun}`
      : `Removed their ${emoji} reaction`,
  });

  return NextResponse.json({ data: { emoji } });
}
