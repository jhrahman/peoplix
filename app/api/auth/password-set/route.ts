import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { Profile } from "@/lib/types";

// Called from /reset-password right after supabase.auth.updateUser() succeeds -
// the same page/mechanism serves two different situations, distinguished here
// by whether this account has ever set its own password before:
//  - password_set_at is null: this is the employee completing their invite/
//    access-approval flow for the very first time -> logged as "joined".
//  - otherwise: this is an existing employee who forgot their password ->
//    logged as an ordinary password update.
// Either way, password_set_at is stamped so a later reset doesn't re-log "joined".
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFirstTime = profile.password_set_at === null;

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    actorEmail: profile.email,
    action: isFirstTime ? "joined" : "update",
    entity: isFirstTime ? "account" : "password",
    comment: isFirstTime
      ? `${profile.email} has been registered to the app`
      : "Reset password via forgot-password link",
  });

  if (isFirstTime) {
    await supabase
      .from("profiles")
      .update({ password_set_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return NextResponse.json({ data: { ok: true } });
}
