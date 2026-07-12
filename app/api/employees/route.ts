import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { full_name, email, phone, department, designation, role } = body;

  if (!full_name || !email || !role) {
    return NextResponse.json(
      { error: "full_name, email, and role are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: { full_name, role },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user" },
      { status: 400 },
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ phone: phone || null, department: department || null, designation: designation || null })
    .eq("id", created.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: resetError } = await admin.auth.resetPasswordForEmail(email);
  if (resetError) {
    console.error("Failed to send password setup email:", resetError.message);
  }

  return NextResponse.json({ data: { id: created.user.id } }, { status: 201 });
}
