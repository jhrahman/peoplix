import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLogRetentionCutoffIso } from "@/lib/audit";
import { AUTH_EVENT_RETENTION_DAYS } from "@/lib/auth-events";

// Hit daily by Vercel Cron (see vercel.json). Vercel signs cron requests with
// an `Authorization: Bearer ${CRON_SECRET}` header when CRON_SECRET is set on
// the project - this is the only thing keeping this route from being callable
// by anyone, so CRON_SECRET must be set in the Vercel project's environment
// variables for this to actually be protected.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = auditLogRetentionCutoffIso();

  const { error, count } = await admin
    .from("audit_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notifications ride on the same daily job: read or not, anything older
  // than 30 days is stale, and this keeps the table small on the free tier.
  const notificationCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: notificationsError, count: notificationsDeleted } = await admin
    .from("notifications")
    .delete({ count: "exact" })
    .lt("created_at", notificationCutoff);

  if (notificationsError) {
    return NextResponse.json({ error: notificationsError.message }, { status: 500 });
  }

  // Account security events are kept longer than the business audit log.
  const eventCutoff = new Date(Date.now() - AUTH_EVENT_RETENTION_DAYS * 86_400_000).toISOString();
  const { error: eventsError, count: eventsDeleted } = await admin
    .from("auth_events")
    .delete({ count: "exact" })
    .lt("created_at", eventCutoff);

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      deleted: count ?? 0,
      notificationsDeleted: notificationsDeleted ?? 0,
      authEventsDeleted: eventsDeleted ?? 0,
    },
  });
}
