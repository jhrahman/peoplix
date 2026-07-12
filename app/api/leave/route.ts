import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

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

  let employeeId = user.id;

  // Only Admin/HR may file a request on someone else's behalf (e.g. bulk import).
  if (employee_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (!profile || !["admin", "hr"].includes(profile.role)) {
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

  return NextResponse.json({ data }, { status: 201 });
}
