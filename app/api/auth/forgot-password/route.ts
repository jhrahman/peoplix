import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuthEvent } from "@/lib/auth-events";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    // The app tells the person plainly that no account exists (it's an internal
    // tool), so Admin should also be able to see that someone tried - a typo, or
    // someone probing for addresses.
    await logAuthEvent({ event: "password_reset_unknown_email", email, request });
    return NextResponse.json(
      { error: "No user found with this email. Please Sign Up first" },
      { status: 404 },
    );
  }

  const { origin } = new URL(request.url);
  const { error: resetError } = await admin.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/reset-password`,
  });

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  await logAuthEvent({ event: "password_reset_requested", email, userId: profile.id, request });

  return NextResponse.json({ data: { sent: true } });
}
