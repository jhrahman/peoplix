import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileById } from "@/lib/auth/get-profile";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import { logAudit } from "@/lib/audit";
import { ensureLeaveBalance, leaveDays, LEAVE_TYPE_LABELS, remainingLeaveDays } from "@/lib/leave";
import type { LeaveType } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const profile = await getProfileById(supabase, user.id);

  const isStaff = profile && ["admin", "hr"].includes(profile.role);

  let query = supabase
    .from("leave_requests")
    .select("*, employee:profiles!leave_requests_employee_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  // "all" only makes a difference for staff - RLS still scopes employees to
  // their own rows regardless of this filter.
  if (scope !== "all" || !isStaff) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`leave-create:${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { leave_type, start_date, end_date, reason, employee_email } = body;

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

  if (!(leave_type in LEAVE_TYPE_LABELS)) {
    return NextResponse.json({ error: "Invalid leave_type" }, { status: 400 });
  }

  let employeeId = user.id;

  const profile = await getProfileById(supabase, user.id);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only Admin/HR may file a request on someone else's behalf (e.g. bulk import).
  if (employee_email) {
    if (!["admin", "hr"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only Admin/HR can file leave for another employee" },
        { status: 403 },
      );
    }

    const { data: targetEmployee } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", employee_email)
      .maybeSingle<{ id: string }>();

    if (!targetEmployee) {
      return NextResponse.json(
        { error: `No employee found with email ${employee_email}` },
        { status: 400 },
      );
    }

    employeeId = targetEmployee.id;
  }

  const days = leaveDays(start_date, end_date);
  const year = new Date(start_date).getFullYear();
  const typeLabel = LEAVE_TYPE_LABELS[leave_type as LeaveType];

  // Admin-client because inserting a first-time balance row requires the
  // staff-only RLS insert policy, same pattern as app/(dashboard)/leave/page.tsx.
  const balance = await ensureLeaveBalance(createAdminClient(), employeeId, year);
  const remaining = remainingLeaveDays(balance, leave_type as LeaveType);

  if (days > remaining) {
    return NextResponse.json(
      {
        error:
          remaining <= 0
            ? `No ${typeLabel} leave left for ${year}.`
            : `Only ${remaining} day(s) of ${typeLabel} leave left for ${year} — this request needs ${days}.`,
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employeeId,
      leave_type,
      start_date,
      end_date,
      reason: reason || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const daysLabel = `${days}d`;

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    actorEmail: profile.email,
    action: "create",
    entity: "leave_request",
    comment:
      employeeId === user.id
        ? `Applied for ${leave_type} leave, ${daysLabel} (${start_date} → ${end_date})`
        : `Filed ${leave_type} leave for ${employee_email}, ${daysLabel} (${start_date} → ${end_date})`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
