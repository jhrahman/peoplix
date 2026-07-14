import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveRequestSummary } from "@/lib/types";
import { ApprovalsTable } from "@/components/leave/approvals-table";
import { LeaveImportExport } from "@/components/leave/leave-import-export";

export async function ApprovalsSection() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, reason, status, employee:profiles!leave_requests_employee_id_fkey(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<(LeaveRequestSummary & { employee: { full_name: string } | null })[]>();

  const pendingApprovals = data ?? [];

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Approvals</CardTitle>
        <LeaveImportExport requests={pendingApprovals} />
      </CardHeader>
      <CardContent>
        <ApprovalsTable requests={pendingApprovals} />
      </CardContent>
    </Card>
  );
}
