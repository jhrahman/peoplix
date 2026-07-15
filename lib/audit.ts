import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditAction, AuditEntity } from "@/lib/types";

// How long an audit log entry is kept before the cleanup cron removes it -
// see app/api/cron/audit-log-cleanup/route.ts. Free-tier Supabase caps DB
// size, so history beyond this window just gets deleted rather than kept.
export const AUDIT_LOG_RETENTION_DAYS = 10;

// Kept as a plain helper (not inlined at call sites) so the `Date.now()` call
// doesn't live directly in a Server Component's render body - see
// https://react.dev/reference/rules/components-and-hooks-must-be-pure.
export function auditLogRetentionCutoffIso() {
  return new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

type LogAuditInput = {
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  entity: AuditEntity;
  comment: string;
};

// Always written through the service-role client, regardless of which client
// performed the actual mutation - audit_logs has no insert policy for user
// sessions. A logging failure must never break the request it's describing,
// so this never throws; it just logs to the server console.
export async function logAudit(input: LogAuditInput) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: input.actorId,
      actor_name: input.actorName,
      actor_email: input.actorEmail,
      action: input.action,
      entity: input.entity,
      comment: input.comment,
    });
    if (error) {
      console.error("Failed to write audit log:", error.message);
    }
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
