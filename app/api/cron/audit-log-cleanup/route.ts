import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLogRetentionCutoffIso } from "@/lib/audit";

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

  return NextResponse.json({ data: { deleted: count ?? 0 } });
}
