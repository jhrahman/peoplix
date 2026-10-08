import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditEngagement, quoted, whose } from "@/lib/engagement-audit";

// Casts or changes the caller's vote on a poll - one row per (poll, person),
// so changing your mind is an upsert of option_id.
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

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.option_id !== "string") {
    return NextResponse.json({ error: "option_id is required" }, { status: 400 });
  }

  // The option being voted for. 22P02 = not a uuid.
  const { data: option, error: optionError } = await supabase
    .from("post_poll_options")
    .select("label")
    .eq("id", body.option_id)
    .eq("post_id", id)
    .maybeSingle<{ label: string }>();

  if (optionError?.code === "22P02" || !option) {
    return NextResponse.json({ error: "That option isn't part of this poll" }, { status: 400 });
  }

  const { data: previous } = await supabase
    .from("post_poll_votes")
    .select("option_id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ option_id: string }>();

  // Voting for what you already chose changes nothing, so it isn't logged either.
  if (previous?.option_id === body.option_id) {
    return NextResponse.json({ data: { post_id: id, option_id: body.option_id } });
  }

  const { error } = await supabase
    .from("post_poll_votes")
    .upsert(
      { post_id: id, user_id: user.id, option_id: body.option_id },
      { onConflict: "post_id,user_id" },
    );

  if (error) {
    // 23503 = that option isn't part of this poll (composite foreign key);
    // 22P02 = not a uuid.
    if (error.code === "23503" || error.code === "22P02") {
      return NextResponse.json({ error: "That option isn't part of this poll" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Whose poll, and what they had chosen before, for the Audit Log message.
  const [{ data: poll }, { data: previousOption }] = await Promise.all([
    supabase
      .from("posts")
      .select("author_id, author:profiles!posts_author_id_fkey(full_name)")
      .eq("id", id)
      .maybeSingle<{ author_id: string; author: { full_name: string } | null }>(),
    previous
      ? supabase
          .from("post_poll_options")
          .select("label")
          .eq("id", previous.option_id)
          .maybeSingle<{ label: string }>()
      : Promise.resolve({ data: null }),
  ]);

  const owner = whose(poll?.author_id ?? null, poll?.author?.full_name, user.id);
  await auditEngagement(supabase, user.id, {
    action: previous ? "update" : "create",
    entity: "post",
    comment: previous
      ? `Changed their vote from ${quoted(previousOption?.label ?? "an option", 40)} to ${quoted(option.label, 40)} in ${owner} poll`
      : `Voted ${quoted(option.label, 40)} in ${owner} poll`,
  });

  return NextResponse.json({ data: { post_id: id, option_id: body.option_id } });
}
