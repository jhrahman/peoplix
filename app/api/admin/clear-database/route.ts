import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const TABLES = ["leave_requests", "leave_balances", "holidays", "attendance"] as const;

export async function POST() {
  // Admin only - not HR - matches the Danger Zone visibility rule.
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

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
