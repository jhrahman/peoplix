import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSystemAdmin } from "@/lib/protected-employees";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const TABLES = [
  "leave_requests",
  "leave_balances",
  "holidays",
  "attendance",
  "overtime_requests",
] as const;

export async function POST() {
  // Restricted to the single System Admin account, not just role === "admin"
  // - matches the Danger Zone visibility rule. Never trust the client-side
  // hide/show alone as the security boundary.
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  if (!isSystemAdmin(auth.profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Service-role client: several of these tables have RLS delete policies that
  // are narrower than "any staff member" by design (e.g. attendance can only
  // delete today's own row - see 0007_attendance_delete_today_only.sql - so
  // history survives normal use). Those policies would silently no-op most of
  // this wipe if run through the session-scoped client. The security boundary
  // for this danger-zone action is the isSystemAdmin gate above, not RLS.
  const admin = createAdminClient();

  for (const table of TABLES) {
    const { error } = await admin.from(table).delete().neq("id", NIL_UUID);
    if (error) {
      return NextResponse.json(
        { error: `Failed clearing ${table}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // leave_balances was just wiped along with leave_requests - re-seed a fresh
  // default balance for every surviving employee so the admin's "All balances"
  // view shows a clean, fully-populated table immediately, instead of rows
  // reappearing one at a time as each employee happens to revisit /leave.
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id");

  if (profilesError) {
    return NextResponse.json(
      { error: `Cleared tables but failed to re-seed leave balances: ${profilesError.message}` },
      { status: 500 },
    );
  }

  if (profiles && profiles.length > 0) {
    const year = new Date().getFullYear();
    const { error: reseedError } = await admin
      .from("leave_balances")
      .insert(profiles.map((p) => ({ employee_id: p.id, year })));

    if (reseedError) {
      return NextResponse.json(
        { error: `Cleared tables but failed to re-seed leave balances: ${reseedError.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data: { cleared: TABLES } });
}
