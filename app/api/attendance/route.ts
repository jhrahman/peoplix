import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayInDhaka } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";
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
  const date = searchParams.get("date");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const isStaff = profile && ["admin", "hr"].includes(profile.role);

  let query = supabase
    .from("attendance")
    .select("*, employee:profiles!attendance_employee_id_fkey(full_name)")
    .order("date", { ascending: false });

  if (scope !== "all" || !isStaff) {
    query = query.eq("employee_id", user.id);
  }

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayInDhaka();

  const { data: existing } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ data: existing });
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({ employee_id: user.id, date: today, check_in: new Date().toISOString() })
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
      action: "create",
      entity: "attendance",
      comment: `Checked in for ${today}`,
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
