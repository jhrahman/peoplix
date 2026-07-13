import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureLeaveBalance } from "@/lib/leave";
import type { SignupRequest } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { status } = await request.json();

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("signup_requests")
    .select("*")
    .eq("id", id)
    .single<SignupRequest>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Signup request not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be reviewed" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  if (status === "approved") {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: existing.email,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: { full_name: existing.full_name, role: "employee" },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create user" },
        { status: 400 },
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        department: existing.department,
        designation: existing.designation,
        phone: existing.mobile,
      })
      .eq("id", created.user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    await ensureLeaveBalance(admin, created.user.id, new Date().getFullYear());

    const { origin } = new URL(request.url);
    const { error: resetError } = await admin.auth.resetPasswordForEmail(existing.email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (resetError) {
      console.error("Failed to send password setup email:", resetError.message);
    }
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("signup_requests")
    .update({ status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ data: updated });
}
