import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, todayInDhaka } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";
import type { Attendance, Profile } from "@/lib/types";

export async function PATCH(
  request: Request,
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
  const body = await request.json().catch(() => ({}));
  const { check_in, check_out } = body as { check_in?: string; check_out?: string };
  const isOverride = check_in !== undefined || check_out !== undefined;

  // RLS scopes this to the employee's own row or staff.
  const { data: existing, error: fetchError } = await supabase
    .from("attendance")
    .select("*, employee:profiles!attendance_employee_id_fkey(full_name)")
    .eq("id", id)
    .single<Attendance & { employee: { full_name: string } | null }>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const isOwnRecord = existing.employee_id === user.id;

  if (!isOverride) {
    // Quick "Check Out" button: stamp check_out with the current time.
    if (!existing.check_in) {
      return NextResponse.json({ error: "Cannot check out before checking in" }, { status: 400 });
    }
    if (existing.check_out) {
      return NextResponse.json({ error: "Already checked out" }, { status: 400 });
    }

    const checkOutAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendance")
      .update({ check_out: checkOutAt })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (profile) {
      await logAudit({
        actorId: profile.id,
        actorName: profile.full_name,
        actorEmail: profile.email,
        action: "update",
        entity: "attendance",
        comment: `Checked out for ${existing.date}, ${formatDuration(existing.check_in, checkOutAt)}`,
      });
    }

    return NextResponse.json({ data });
  }

  // Manual override/correction: caller supplies the actual times directly.
  const nextCheckIn = check_in !== undefined ? check_in : existing.check_in;
  const nextCheckOut = check_out !== undefined ? check_out : existing.check_out;

  if (nextCheckIn && nextCheckOut && new Date(nextCheckOut) < new Date(nextCheckIn)) {
    return NextResponse.json(
      { error: "Check-out must be on or after check-in" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("attendance")
    .update({ check_in: nextCheckIn, check_out: nextCheckOut })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (profile) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      actorEmail: profile.email,
      action: "update",
      entity: "attendance",
      comment: isOwnRecord
        ? `Updated own attendance record for ${existing.date}, ${formatDuration(nextCheckIn, nextCheckOut)}`
        : `Updated ${existing.employee?.full_name ?? "an employee"}'s attendance record for ${existing.date}, ${formatDuration(nextCheckIn, nextCheckOut)}`,
    });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
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

  const { data: existing, error: fetchError } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", id)
    .single<Attendance>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
  }

  if (existing.employee_id !== user.id || existing.date !== todayInDhaka()) {
    return NextResponse.json(
      { error: "Only your own attendance record for today can be deleted" },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("attendance").delete().eq("id", id);

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
      action: "delete",
      entity: "attendance",
      comment: `Deleted today's attendance record`,
    });
  }

  return NextResponse.json({ data: { id } });
}
