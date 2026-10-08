import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import { logAudit } from "@/lib/audit";
import { logAuthEvent } from "@/lib/auth-events";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sends the "set your password" email again to someone who was invited but
// never finished setting up. Admin only, re-checked here from the session.
// Only for accounts that still have no password of their own: this must not be a
// way to trigger reset emails for people who are already active.
export async function POST(request: Request) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const allowed = await checkRateLimit(`resend-invite:${auth.user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.user_id === "string" ? body.user_id : "";

  if (!UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, email, password_set_at")
    .eq("id", userId)
    .maybeSingle<{ id: string; full_name: string; email: string; password_set_at: string | null }>();

  if (!profile) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (profile.password_set_at) {
    return NextResponse.json(
      { error: "This person has already set a password. They can use Forgot password instead." },
      { status: 400 },
    );
  }

  const { origin } = new URL(request.url);
  const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    // Supabase limits how often one address can be emailed; pass its message on.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAuthEvent({
    event: "invite_resent",
    email: profile.email,
    userId: profile.id,
    actorId: auth.profile.id,
    detail: `Resent by ${auth.profile.full_name}`,
    request,
  });
  await logAudit({
    actorId: auth.profile.id,
    actorName: auth.profile.full_name,
    actorEmail: auth.profile.email,
    action: "update",
    entity: "employee",
    comment: `Resent the invite email to ${profile.full_name} (${profile.email})`,
  });

  return NextResponse.json({ data: { sent: true } });
}
