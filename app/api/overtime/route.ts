import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import { todayInDhaka } from "@/lib/attendance";
import { isValidOvertimeHours } from "@/lib/overtime";
import { logAudit } from "@/lib/audit";

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
    .from("overtime_requests")
    .select("*, employee:profiles!overtime_requests_employee_id_fkey(full_name)")
    .order("date", { ascending: false });

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

  const allowed = await checkRateLimit(`overtime-create:${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { date, hours, reason } = body;

  if (!date || hours === undefined || hours === null || hours === "") {
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
    .insert({ employee_id: user.id, date, hours: numericHours, reason: reason || null })
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

  const profile = await getProfileById(supabase, user.id);

  if (profile) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      actorEmail: profile.email,
      action: "create",
      entity: "overtime_request",
      comment: `Logged ${numericHours}h overtime for ${date}`,
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
