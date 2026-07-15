import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { Profile } from "@/lib/types";

// The password update itself happens client-side via supabase.auth.updateUser()
// (components/settings/change-password-form.tsx) - there's no server route
// involved in that call at all. This route exists purely so that success can
// be recorded in the audit log, gated by the caller's own session cookie so
// the actor identity can't be spoofed.
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

  if (profile) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      actorEmail: profile.email,
      action: "update",
      entity: "password",
      comment: "Changed account password",
    });
  }

  return NextResponse.json({ data: { ok: true } });
}
