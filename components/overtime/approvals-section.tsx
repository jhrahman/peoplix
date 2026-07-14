import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OvertimeRequestSummary } from "@/lib/types";
import { OvertimeApprovalsTable } from "@/components/overtime/overtime-approvals-table";

export async function OvertimeApprovalsSection() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("overtime_requests")
    .select("id, date, hours, reason, status, employee:profiles!overtime_requests_employee_id_fkey(full_name)")
    .eq("status", "pending")
    .order("date", { ascending: false })
    .returns<(OvertimeRequestSummary & { employee: { full_name: string } | null })[]>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <OvertimeApprovalsTable requests={data ?? []} />
      </CardContent>
    </Card>
  );
}
