import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileById } from "@/lib/auth/get-profile";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import { auditEngagement, commentSummary, whose } from "@/lib/engagement-audit";
import { mediaColumns, mediaFromColumns, mediaLabel, validateCommentMedia } from "@/lib/comment-media";
import { removeCommentMediaObjects } from "@/lib/engagement-storage";
import { validateMentions, visibleLength } from "@/lib/mentions";
import { mentionedIds, notify } from "@/lib/notifications";
import { CARD_COMMENT_MAX_LENGTH, CARD_NOUN, isOccasion, type Occasion } from "@/lib/wish-constants";
import { openCard } from "@/lib/wishes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A comment on a birthday / work-anniversary card, with @tags like any other
// comment. Written with the service-role client (no insert policy) because it
// first has to prove the celebration is real and still open, which needs the
// private birthday table.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`wish-comment:${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const mediaCheck = validateCommentMedia(body?.media, user.id);

  if (!mediaCheck.ok) {
    return NextResponse.json({ error: mediaCheck.error }, { status: 400 });
  }
  const media = mediaCheck.media;

  // A photo or clip the browser already uploaded is an orphan if the comment
  // isn't created, so every rejection from here on removes it.
  const fail = async (error: string, status: number) => {
    if (media && media.kind !== "gif") {
      await removeCommentMediaObjects([{ media_kind: media.kind, media_path: media.path }]);
    }
    return NextResponse.json({ error }, { status });
  };

  if (
    typeof body?.recipient_id !== "string" ||
    !UUID_PATTERN.test(body.recipient_id) ||
    !isOccasion(body.occasion) ||
    typeof body.occasion_date !== "string"
  ) {
    return fail("recipient_id, occasion and occasion_date are required", 400);
  }
  if (!content && !media) {
    return fail("Write something or add a GIF, photo or video", 400);
  }
  if (visibleLength(content) > CARD_COMMENT_MAX_LENGTH) {
    return fail(`Comments are limited to ${CARD_COMMENT_MAX_LENGTH} characters`, 400);
  }

  const mentionError = await validateMentions(supabase, content);
  if (mentionError) {
    return fail(mentionError, 400);
  }

  const profile = await getProfileById(supabase, user.id);
  if (!profile) {
    return fail("Forbidden", 403);
  }

  const card = await openCard({
    recipientId: body.recipient_id,
    occasion: body.occasion,
    date: body.occasion_date,
  });
  if (!card.ok) {
    return fail(card.error, 400);
  }

  const { data: comment, error } = await createAdminClient()
    .from("celebration_comments")
    .insert({
      recipient_id: body.recipient_id,
      occasion: body.occasion,
      occasion_date: body.occasion_date,
      author_id: user.id,
      content,
      ...mediaColumns(media),
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    return fail(error.message, 400);
  }

  // The celebrant hears about comments on their card; anyone tagged hears they
  // were tagged. Someone who is both gets just the more specific tag alert.
  const tagged = mentionedIds(content);
  await notify({
    actorId: user.id,
    occasionDate: body.occasion_date,
    occasionOwnerId: body.recipient_id,
    content: content || `Sent ${mediaLabel(media)}`,
    recipients: [
      ...(body.recipient_id !== user.id && !tagged.includes(body.recipient_id)
        ? [{ recipientId: body.recipient_id, type: "comment" as const, context: body.occasion }]
        : []),
      ...tagged.map((recipientId) => ({
        recipientId,
        type: "mention" as const,
        context: body.occasion,
      })),
    ],
  });

  await auditEngagement(supabase, user.id, {
    action: "create",
    entity: "wish",
    comment: `Commented on ${whose(body.recipient_id, card.recipientName, user.id)} ${CARD_NOUN[body.occasion as Occasion]}: ${commentSummary(content, media)}`,
  });

  return NextResponse.json(
    {
      data: {
        ...comment,
        media: mediaFromColumns(mediaColumns(media)),
        author: {
          id: profile.id,
          full_name: profile.full_name,
          designation: profile.designation,
          avatar_url: profile.avatar_url,
        },
      },
    },
    { status: 201 },
  );
}
