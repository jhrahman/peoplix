import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
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

  for (const table of TABLES) {
    const { error } = await auth.supabase.from(table).delete().neq("id", NIL_UUID);
    if (error) {
      return NextResponse.json(
        { error: `Failed clearing ${table}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data: { cleared: TABLES } });
}
