import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureLeaveBalance, leaveDays, LEAVE_TYPE_BALANCE_COLUMNS } from "@/lib/leave";
import type { LeaveRequest } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single<LeaveRequest>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be reviewed" },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("leave_requests")
    .update({ status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single<LeaveRequest>();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (status === "approved") {
    const admin = createAdminClient();
    const year = new Date(existing.start_date).getFullYear();
    const balance = await ensureLeaveBalance(admin, existing.employee_id, year);
    const days = leaveDays(existing.start_date, existing.end_date);
    const { used } = LEAVE_TYPE_BALANCE_COLUMNS[existing.leave_type];

    await admin
      .from("leave_balances")
      .update({ [used]: (balance[used] as number) + days })
      .eq("id", balance.id);
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
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

  // RLS already restricts this to the employee's own pending requests or staff.
  const { error, count } = await supabase
    .from("leave_requests")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json(
      { error: "Request not found, not yours, or no longer pending" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id } });
}
