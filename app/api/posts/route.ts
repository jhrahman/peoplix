import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import {
  KUDOS_VALUES,
  kudosValueById,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  POST_MAX_LENGTH,
  SEARCH_MAX_LENGTH,
  fetchFeed,
  fetchPost,
  isPostKind,
  validateMediaInput,
} from "@/lib/engagement";
import { validateMentions, visibleLength } from "@/lib/mentions";
import { removeMediaObjects } from "@/lib/engagement-storage";
import { mentionedIds, notify, postContext } from "@/lib/notifications";
import { auditEngagement, quoted } from "@/lib/engagement-audit";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const search = searchParams.get("q")?.trim().slice(0, SEARCH_MAX_LENGTH);

  const { posts, hasMore, error } = await fetchFeed(supabase, user.id, {
    announcements: searchParams.get("type") === "announcements",
    kind: isPostKind(kind) ? kind : null,
    pinned: searchParams.get("pinned") === "false" ? false : undefined,
    before: searchParams.get("before"),
    search: search || null,
    mentionedUserId: searchParams.get("mentioned") === "me" ? user.id : null,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data: posts, has_more: hasMore });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`post-create:${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const kind = body.kind ?? "update";
  const isAnnouncement = body.is_announcement === true;

  // Whatever the outcome below, files the client already uploaded for this
  // post are orphans if it isn't created - clean them up before returning.
  const mediaCheck = validateMediaInput(body.media, user.id);
  const fail = async (error: string, status: number) => {
    if (mediaCheck.ok) await removeMediaObjects(mediaCheck.items);
    return NextResponse.json({ error }, { status });
  };

  if (!isPostKind(kind)) {
    return fail("Unknown post type", 400);
  }

  if (!content) {
    return fail("content is required", 400);
  }

  if (visibleLength(content) > POST_MAX_LENGTH) {
    return fail(`Posts are limited to ${POST_MAX_LENGTH} characters`, 400);
  }

  if (!mediaCheck.ok) {
    return NextResponse.json({ error: mediaCheck.error }, { status: 400 });
  }

  const mentionError = await validateMentions(supabase, content);
  if (mentionError) {
    return fail(mentionError, 400);
  }

  const profile = await getProfileById(supabase, user.id);

  if (!profile) {
    return fail("Forbidden", 403);
  }

  // Re-checked here from the session, not just hidden in the composer - the
  // insert policy in 0013_engagement.sql enforces the same rule again.
  if (isAnnouncement && !["admin", "hr"].includes(profile.role)) {
    return fail("Only Admin or HR can publish announcements", 403);
  }

  if (isAnnouncement && kind !== "update") {
    return fail("Announcements can't be kudos or polls", 400);
  }

  let kudosRecipientId: string | null = null;
  let kudosValue: string | null = null;
  if (kind === "kudos") {
    kudosRecipientId = typeof body.kudos_recipient_id === "string" ? body.kudos_recipient_id : null;
    kudosValue = typeof body.kudos_value === "string" ? body.kudos_value : null;

    if (!kudosRecipientId || !UUID_PATTERN.test(kudosRecipientId)) {
      return fail("Choose a colleague to recognize", 400);
    }
    if (kudosRecipientId === user.id) {
      return fail("You can't give kudos to yourself", 400);
    }
    if (!KUDOS_VALUES.some((v) => v.id === kudosValue)) {
      return fail("Choose a company value for the kudos", 400);
    }
  }

  let pollOptions: string[] = [];
  if (kind === "poll") {
    if (mediaCheck.items.length > 0) {
      return fail("Polls can't have attachments", 400);
    }
    pollOptions = Array.isArray(body.poll_options)
      ? body.poll_options
          .filter((o: unknown): o is string => typeof o === "string")
          .map((o: string) => o.trim())
          .filter(Boolean)
      : [];

    if (pollOptions.length < POLL_MIN_OPTIONS || pollOptions.length > POLL_MAX_OPTIONS) {
      return fail(`A poll needs ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} options`, 400);
    }
    if (pollOptions.some((o) => o.length > POLL_OPTION_MAX_LENGTH)) {
      return fail(`Poll options are limited to ${POLL_OPTION_MAX_LENGTH} characters`, 400);
    }
    if (new Set(pollOptions.map((o) => o.toLowerCase())).size !== pollOptions.length) {
      return fail("Poll options must be different from each other", 400);
    }
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      content,
      kind,
      is_announcement: isAnnouncement,
      kudos_recipient_id: kudosRecipientId,
      kudos_value: kudosValue,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    // 23503 = the kudos recipient doesn't exist (anymore).
    return fail(error.code === "23503" ? "That colleague no longer exists" : error.message, 400);
  }

  // Children are separate inserts, so if one fails, delete the post (its
  // cascade removes whatever did get written) rather than leave half a post.
  let childError: string | null = null;

  if (pollOptions.length > 0) {
    const { error: optionsError } = await supabase
      .from("post_poll_options")
      .insert(pollOptions.map((label, position) => ({ post_id: post.id, label, position })));
    if (optionsError) childError = optionsError.message;
  }

  if (!childError && mediaCheck.items.length > 0) {
    const { error: mediaError } = await supabase.from("post_media").insert(
      mediaCheck.items.map((m, position) => ({
        post_id: post.id,
        kind: m.kind,
        path: m.path,
        mime_type: m.mime_type,
        size_bytes: m.size_bytes,
        position,
      })),
    );
    if (mediaError) childError = mediaError.message;
  }

  if (childError) {
    await supabase.from("posts").delete().eq("id", post.id);
    return fail(childError, 400);
  }

  // Tell the people who were tagged - and, for kudos, the colleague being
  // recognized (who gets the kudos notification instead of a tag one).
  const context = postContext({ kind, is_announcement: isAnnouncement });
  await notify({
    actorId: user.id,
    postId: post.id,
    content,
    recipients: [
      ...(kudosRecipientId
        ? [{ recipientId: kudosRecipientId, type: "kudos" as const, context: "kudos" as const }]
        : []),
      ...mentionedIds(content)
        .filter((id) => id !== kudosRecipientId)
        .map((recipientId) => ({ recipientId, type: "mention" as const, context })),
    ],
  });

  const created = await fetchPost(supabase, user.id, post.id);

  if (!created) {
    return NextResponse.json({ error: "Post was created but could not be loaded" }, { status: 500 });
  }

  // Every post is recorded in the Audit Log, whatever its kind.
  const attachments = created.media.length
    ? ` with ${created.media.length} ${created.media[0].kind === "video" ? "video" : created.media.length === 1 ? "photo" : "photos"}`
    : "";
  const comment = isAnnouncement
    ? `Published a company announcement: ${quoted(content)}${attachments}`
    : kind === "kudos"
      ? `Gave kudos to ${created.kudos?.recipient.full_name ?? "a colleague"} for ${kudosValueById(created.kudos?.value ?? "")?.label ?? "great work"}: ${quoted(content)}${attachments}`
      : kind === "poll"
        ? `Started a poll: ${quoted(content)} (${created.poll?.options.length ?? 0} options)`
        : `Posted an update: ${quoted(content)}${attachments}`;
  await auditEngagement(supabase, user.id, { action: "create", entity: "post", comment });

  return NextResponse.json({ data: created }, { status: 201 });
}
