import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureLeaveBalance,
  leaveDays,
  LEAVE_TYPE_BALANCE_COLUMNS,
  LEAVE_TYPE_LABELS,
  remainingLeaveDays,
} from "@/lib/leave";
import { logAudit } from "@/lib/audit";
import type { LeaveRequest, Profile } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // Two distinct actions share this route, disambiguated by payload shape:
  // a `status` field means Admin/HR review; anything else means the owning
  // employee correcting a still-pending request they submitted by mistake.
  if (!("status" in body)) {
    return handleSelfEdit(id, body);
  }

  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const { status } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("leave_requests")
    .select("*, employee:profiles!leave_requests_employee_id_fkey(full_name)")
    .eq("id", id)
    .single<LeaveRequest & { employee: { full_name: string } | null }>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be reviewed" },
      { status: 400 },
    );
  }

  if (status === "approved") {
    const admin = createAdminClient();
    const year = new Date(existing.start_date).getFullYear();
    const balance = await ensureLeaveBalance(admin, existing.employee_id, year);
    const days = leaveDays(existing.start_date, existing.end_date);
    const remaining = remainingLeaveDays(balance, existing.leave_type);

    if (days > remaining) {
      const typeLabel = LEAVE_TYPE_LABELS[existing.leave_type];
      return NextResponse.json(
        {
          error: `Approving this would exceed ${existing.employee?.full_name ?? "the employee"}'s remaining ${typeLabel} leave balance (${remaining} day(s) left, ${days} requested).`,
        },
        { status: 400 },
      );
    }

    const { used } = LEAVE_TYPE_BALANCE_COLUMNS[existing.leave_type];
    await admin
      .from("leave_balances")
      .update({ [used]: (balance[used] as number) + days })
      .eq("id", balance.id);
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

  await logAudit({
    actorId: auth.profile.id,
    actorName: auth.profile.full_name,
    actorEmail: auth.profile.email,
    action: status === "approved" ? "approve" : "reject",
    entity: "leave_request",
    comment: `${status === "approved" ? "Approved" : "Rejected"} ${existing.employee?.full_name ?? "an employee"}'s ${existing.leave_type} leave, ${leaveDays(existing.start_date, existing.end_date)}d (${existing.start_date} → ${existing.end_date})`,
  });

  return NextResponse.json({ data: updated });
}

// Lets an employee correct a request they submitted by mistake - only while it's
// still pending (before Admin/HR has acted on it), and only their own.
async function handleSelfEdit(id: string, body: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single<LeaveRequest>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  if (existing.employee_id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own requests" },
      { status: 403 },
    );
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be edited" },
      { status: 400 },
    );
  }

  const { leave_type, start_date, end_date, reason } = body as {
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    reason?: string;
  };

  if (!leave_type || !start_date || !end_date) {
    return NextResponse.json(
      { error: "leave_type, start_date, and end_date are required" },
      { status: 400 },
    );
  }

  if (end_date < start_date) {
    return NextResponse.json(
      { error: "end_date must be on or after start_date" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .update({ leave_type, start_date, end_date, reason: reason || null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
      entity: "leave_request",
      comment: `Updated pending ${leave_type} leave request, ${leaveDays(start_date, end_date)}d (${start_date} → ${end_date})`,
    });
  }

  return NextResponse.json({ data });
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

  const { data: existing } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single<LeaveRequest>();

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profile && existing) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      actorEmail: profile.email,
      action: "cancel",
      entity: "leave_request",
      comment: `Cancelled pending ${existing.leave_type} leave request, ${leaveDays(existing.start_date, existing.end_date)}d (${existing.start_date} → ${existing.end_date})`,
    });
  }

  return NextResponse.json({ data: { id } });
}
