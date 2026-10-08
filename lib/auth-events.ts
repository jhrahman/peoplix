import { createAdminClient } from "@/lib/supabase/admin";

// How long a security event is kept. Longer than the 10-day audit log on
// purpose: "invited three weeks ago and never accepted" is exactly the kind of
// thing this trail exists to show. Pruned by the daily cron
// (app/api/cron/audit-log-cleanup/route.ts).
export const AUTH_EVENT_RETENTION_DAYS = 90;

export type AuthEventType =
  | "signup_requested"
  | "signup_approved"
  | "signup_rejected"
  | "invite_sent"
  | "invite_resent"
  | "password_set"
  | "password_reset_requested"
  | "password_reset_unknown_email"
  | "password_reset_completed"
  | "password_changed";

export type AuthEvent = {
  id: string;
  event: AuthEventType;
  user_id: string | null;
  email: string;
  actor_id: string | null;
  detail: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

function clientIp(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request?.headers.get("x-real-ip") || null)?.slice(0, 64) ?? null;
}

// Records one account-security event. Written with the service-role client
// because auth_events has no insert policy (nobody can forge or erase one), and
// - like logAudit - it never throws: a logging problem must not break the
// sign-up, invite or reset it describes. Never pass a password, token, or link.
export async function logAuthEvent(input: {
  event: AuthEventType;
  email: string;
  userId?: string | null;
  actorId?: string | null;
  detail?: string;
  request?: Request;
}) {
  try {
    const { error } = await createAdminClient()
      .from("auth_events")
      .insert({
        event: input.event,
        email: input.email.trim().toLowerCase().slice(0, 320),
        user_id: input.userId ?? null,
        actor_id: input.actorId ?? null,
        detail: input.detail?.slice(0, 200) ?? null,
        ip: clientIp(input.request),
        user_agent: input.request?.headers.get("user-agent")?.slice(0, 200) ?? null,
      });
    if (error) console.error("Failed to write auth event:", error.message);
  } catch (err) {
    console.error("Failed to write auth event:", err);
  }
}
