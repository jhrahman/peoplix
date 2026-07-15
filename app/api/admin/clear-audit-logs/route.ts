import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export async function POST() {
  // Any Admin can do this (not restricted to the System Admin like the
  // Danger Zone's Clear Database) - it's just clearing history, not the
  // app's live operational records.
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("audit_logs")
    .delete({ count: "exact" })
    .neq("id", NIL_UUID);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: count ?? 0 } });
}
