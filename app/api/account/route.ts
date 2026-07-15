import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProtectedEmployee } from "@/lib/protected-employees";
import { logAudit } from "@/lib/audit";
import type { Profile } from "@/lib/types";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedEmployee(user.email)) {
    return NextResponse.json(
      { error: "This account cannot be deleted" },
      { status: 403 },
    );
  }

  // Log before deleting, not after: actor_id has a foreign key to profiles,
  // and this account's own profile row is about to be gone (cascades from
  // the auth.users delete below) - inserting the log afterwards would fail
  // with a dangling foreign key.
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
      action: "delete",
      entity: "account",
      comment: "Deleted own account",
    });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ data: { id: user.id } });
}
