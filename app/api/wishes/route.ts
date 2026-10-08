import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileById } from "@/lib/auth/get-profile";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import { todayInDhaka } from "@/lib/attendance";
import { AUTHOR_COLUMNS } from "@/lib/engagement";
import { notify } from "@/lib/notifications";
import { auditEngagement, quoted } from "@/lib/engagement-audit";
import { summarizeReactions } from "@/lib/engagement";
import { mediaFromColumns } from "@/lib/comment-media";
import { WISH_MAX_LENGTH, isOccasion } from "@/lib/wish-constants";
import { verifyOccasion } from "@/lib/wishes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WISH_SELECT = `id, recipient_id, occasion, occasion_date, years, message, created_at,
  sender:profiles!celebration_wishes_sender_id_fkey(${AUTHOR_COLUMNS})`;

// The card for one celebration: every wish sent for it, newest first.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const recipient = searchParams.get("recipient");
  const occasion = searchParams.get("occasion");
  const date = searchParams.get("date");

  if (!recipient || !UUID_PATTERN.test(recipient) || !isOccasion(occasion) || !date) {
    return NextResponse.json({ error: "recipient, occasion and date are required" }, { status: 400 });
  }

  // Everything on the card in one round trip: the wishes, the conversation
  // under them, and the reactions.
  const [wishes, comments, reactions] = await Promise.all([
    supabase
      .from("celebration_wishes")
      .select(WISH_SELECT)
      .eq("recipient_id", recipient)
      .eq("occasion", occasion)
      .eq("occasion_date", date)
      .order("created_at", { ascending: false }),
    supabase
      .from("celebration_comments")
      .select(`id, content, created_at, media_kind, media_path, media_url, media_mime, media_size, author:profiles!celebration_comments_author_id_fkey(${AUTHOR_COLUMNS})`)
      .eq("recipient_id", recipient)
      .eq("occasion", occasion)
      .eq("occasion_date", date)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("celebration_reactions")
      .select("emoji, user_id, created_at, user:profiles!celebration_reactions_user_id_fkey(full_name)")
      .eq("recipient_id", recipient)
      .eq("occasion", occasion)
      .eq("occasion_date", date)
      .order("created_at", { ascending: true }),
  ]);

  const error = wishes.error ?? comments.error ?? reactions.error;
  if (error) {
    // 22007 / 22008 = malformed date.
    return NextResponse.json({ error: error.message }, { status: error.code?.startsWith("22") ? 400 : 500 });
  }

  return NextResponse.json({
    data: wishes.data,
    comments: (comments.data ?? []).map(
      ({ media_kind, media_path, media_url, media_mime, media_size, ...rest }) => ({
        ...rest,
        media: mediaFromColumns({ media_kind, media_path, media_url, media_mime, media_size }),
      }),
    ),
    reactions: summarizeReactions(
      (reactions.data ?? []) as unknown as Parameters<typeof summarizeReactions>[0],
      user.id,
    ),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`wish-create:${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (typeof body?.recipient_id !== "string" || !UUID_PATTERN.test(body.recipient_id)) {
    return NextResponse.json({ error: "Choose who to wish" }, { status: 400 });
  }
  if (body.recipient_id === user.id) {
    return NextResponse.json({ error: "You can't send a wish to yourself" }, { status: 400 });
  }
  if (!isOccasion(body.occasion) || typeof body.occasion_date !== "string") {
    return NextResponse.json({ error: "occasion and occasion_date are required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Write a short message" }, { status: 400 });
  }
  if (message.length > WISH_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Wishes are limited to ${WISH_MAX_LENGTH} characters` },
      { status: 400 },
    );
  }

  const profile = await getProfileById(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Is it really their day? (Reads the private birthday table - server only.)
  const verified = await verifyOccasion({
    recipientId: body.recipient_id,
    occasion: body.occasion,
    date: body.occasion_date,
    today: todayInDhaka(),
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  // Service-role insert: wishes have no insert policy, because the check above
  // is what makes a wish legitimate and a user session can't be trusted to
  // have done it. sender_id always comes from the session, never the body.
  const { data: wish, error } = await createAdminClient()
    .from("celebration_wishes")
    .insert({
      sender_id: user.id,
      recipient_id: body.recipient_id,
      occasion: body.occasion,
      occasion_date: body.occasion_date,
      years: verified.years,
      message,
    })
    .select("id, recipient_id, occasion, occasion_date, years, message, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You've already sent a wish for this" }, { status: 400 });
    }
    if (error.code === "23503") {
      return NextResponse.json({ error: "That colleague no longer exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await notify({
    actorId: user.id,
    occasionDate: body.occasion_date,
    occasionOwnerId: body.recipient_id,
    content: message,
    recipients: [{ recipientId: body.recipient_id, type: "wish", context: body.occasion }],
  });

  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", body.recipient_id)
    .maybeSingle<{ full_name: string }>();
  await auditEngagement(supabase, user.id, {
    action: "create",
    entity: "wish",
    comment: `Sent ${
      body.occasion === "birthday"
        ? "a birthday wish"
        : body.occasion === "new_joiner"
          ? "a welcome message"
          : `a ${verified.years}-year work anniversary wish`
    } to ${recipientProfile?.full_name ?? "a colleague"}: ${quoted(message)}`,
  });

  return NextResponse.json(
    {
      data: {
        ...wish,
        sender: {
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
