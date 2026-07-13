import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("signup_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// Public: anyone on the login/signup page can submit a request, no session required.
export async function POST(request: Request) {
  const body = await request.json();
  const { full_name, email, department, designation, mobile } = body;

  if (!full_name || !email) {
    return NextResponse.json(
      { error: "full_name and email are required" },
      { status: 400 },
    );
  }

  // No .select() here: the SELECT policy on signup_requests is admin-only, and an
  // anonymous submitter has no reason to read the row back - Postgres RLS requires
  // the inserted row to pass the SELECT policy too when RETURNING is requested,
  // so chaining .select() here would fail RLS even though the insert itself is allowed.
  const supabase = await createClient();
  const { error } = await supabase.from("signup_requests").insert({
    full_name,
    email,
    department: department || null,
    designation: designation || null,
    mobile: mobile || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A pending request for this email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { submitted: true } }, { status: 201 });
}
