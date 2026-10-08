import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmoji } from "@/lib/engagement";
import { auditEngagement, whose } from "@/lib/engagement-audit";
import { notify, retractReactionNotification } from "@/lib/notifications";
import { CARD_NOUN, isOccasion } from "@/lib/wish-constants";
import { openCard } from "@/lib/wishes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Params = { params: Promise<{ recipient: string; occasion: string; date: string }> };

async function parse({ params }: Params) {
  const { recipient, occasion, date } = await params;
  if (!UUID_PATTERN.test(recipient) || !isOccasion(occasion) || !DATE_PATTERN.test(date)) return null;
  return { recipient, occasion, date };
}

// Reacting to a birthday / work-anniversary card. The URL is the card's key, so
// the shared ReactionBar works unchanged. Adding goes through the API (it must
// prove the celebration is real and open); removing is your own row, which the
// delete policy allows directly.
export async function POST(request: Request, ctx: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const card = await parse(ctx);
  const body = await request.json().catch(() => null);

  if (!card) {
    return NextResponse.json({ error: "Invalid card" }, { status: 400 });
  }
  if (!isAllowedEmoji(body?.emoji)) {
    return NextResponse.json({ error: "Unknown emoji" }, { status: 400 });
  }

  const open = await openCard({ recipientId: card.recipient, occasion: card.occasion, date: card.date });
  if (!open.ok) {
    return NextResponse.json({ error: open.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const key = {
    recipient_id: card.recipient,
    occasion: card.occasion,
    occasion_date: card.date,
    user_id: user.id,
    emoji: body.emoji,
  };

  // Same emoji again is a quiet no-op: nothing to log or notify twice.
  const { data: existing } = await admin
    .from("celebration_reactions")
    .select("emoji")
    .match(key)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ data: { emoji: body.emoji } });
  }

  const { error } = await admin.from("celebration_reactions").insert(key);
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await notify({
    actorId: user.id,
    occasionDate: card.date,
    occasionOwnerId: card.recipient,
    content: "",
    recipients: [
      { recipientId: card.recipient, type: "reaction", context: card.occasion, emoji: body.emoji },
    ],
  });

  await auditEngagement(supabase, user.id, {
    action: "create",
    entity: "wish",
    comment: `Reacted ${body.emoji} to ${whose(card.recipient, open.recipientName, user.id)} ${CARD_NOUN[card.occasion]}`,
  });

  return NextResponse.json({ data: { emoji: body.emoji } });
}

export async function DELETE(request: Request, ctx: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const card = await parse(ctx);
  const emoji = new URL(request.url).searchParams.get("emoji");

  if (!card) {
    return NextResponse.json({ error: "Invalid card" }, { status: 400 });
  }
  if (!isAllowedEmoji(emoji)) {
    return NextResponse.json({ error: "Unknown emoji" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("celebration_reactions")
    .delete({ count: "exact" })
    .eq("recipient_id", card.recipient)
    .eq("occasion", card.occasion)
    .eq("occasion_date", card.date)
    .eq("user_id", user.id)
    .eq("emoji", emoji);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Nothing was removed: nothing to withdraw or log (removing is always a success).
  if (!count) {
    return NextResponse.json({ data: { emoji } });
  }

  const { count: remaining } = await supabase
    .from("celebration_reactions")
    .select("emoji", { count: "exact", head: true })
    .eq("recipient_id", card.recipient)
    .eq("occasion", card.occasion)
    .eq("occasion_date", card.date)
    .eq("user_id", user.id);

  if (!remaining) {
    await retractReactionNotification({
      actorId: user.id,
      occasionDate: card.date,
      occasionOwnerId: card.recipient,
    });
  }

  const { data: recipient } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", card.recipient)
    .maybeSingle<{ full_name: string }>();

  await auditEngagement(supabase, user.id, {
    action: "delete",
    entity: "wish",
    comment: `Removed their ${emoji} reaction from ${whose(card.recipient, recipient?.full_name, user.id)} ${CARD_NOUN[card.occasion]}`,
  });

  return NextResponse.json({ data: { emoji } });
}
