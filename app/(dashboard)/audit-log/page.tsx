import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogView } from "@/components/audit-log/audit-log-view";
import { auditLogRetentionCutoffIso } from "@/lib/audit";
import type { AuditLog } from "@/lib/types";

export default async function AuditLogPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) return null;

  const isAdmin = profile.role === "admin";
  const cutoff = auditLogRetentionCutoffIso();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("actor_id", profile.id);
  }

  const { data } = await query.returns<AuditLog[]>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <AuditLogView logs={data ?? []} isAdmin={isAdmin} />
      </CardContent>
    </Card>
  );
}
