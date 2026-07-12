import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { todayInDhaka } from "@/lib/attendance";
import { isValidOvertimeHours } from "@/lib/overtime";
import type { OvertimeRequest } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // Two distinct actions share this route, disambiguated by payload shape:
  // a `status` field means Admin review; anything else means the owning
  // employee correcting a still-pending entry they logged by mistake.
  if (!("status" in body)) {
    return handleSelfEdit(id, body);
  }

  // Admin only - not HR - this is the one explicit rule for overtime approvals.
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { status } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("overtime_requests")
    .select("*")
    .eq("id", id)
    .single<OvertimeRequest>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Overtime request not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be reviewed" },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("overtime_requests")
    .update({ status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

// Lets an employee correct an overtime entry they logged by mistake - only while
// it's still pending (before Admin has reviewed it), and only their own.
async function handleSelfEdit(id: string, body: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("overtime_requests")
    .select("*")
    .eq("id", id)
    .single<OvertimeRequest>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Overtime entry not found" }, { status: 404 });
  }

  if (existing.employee_id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own entries" },
      { status: 403 },
    );
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending entries can be edited" },
      { status: 400 },
    );
  }

  const { date, hours, reason } = body as { date?: string; hours?: number; reason?: string };

  if (!date || hours === undefined || hours === null || (hours as unknown as string) === "") {
    return NextResponse.json({ error: "date and hours are required" }, { status: 400 });
  }

  const numericHours = Number(hours);
  if (!isValidOvertimeHours(numericHours)) {
    return NextResponse.json(
      { error: "Hours must be between 0.5 and 12, in 0.5 hour increments" },
      { status: 400 },
    );
  }

  if (date > todayInDhaka()) {
    return NextResponse.json(
      { error: "Cannot log overtime for a future date" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("overtime_requests")
    .update({ date, hours: numericHours, reason: reason || null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already logged overtime for that date." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
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

  // RLS already restricts this to the employee's own pending entries or an Admin.
  const { error, count } = await supabase
    .from("overtime_requests")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json(
      { error: "Entry not found, not yours, or no longer pending" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id } });
}
