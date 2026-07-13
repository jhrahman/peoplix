import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OvertimeRequest } from "@/lib/types";
import { OvertimeSummaryCards } from "@/components/overtime/overtime-summary-cards";
import { LogOvertimeDialog } from "@/components/overtime/log-overtime-dialog";
import { MyOvertimeTable } from "@/components/overtime/my-overtime-table";
import { OvertimeApprovalsTable } from "@/components/overtime/overtime-approvals-table";

export default async function OvertimePage() {
  const { supabase, user, profile } = await getCurrentProfile();

  const isAdmin = profile?.role === "admin";

  const [{ data: myRequests }, pendingApprovalsResult] = await Promise.all([
    supabase
      .from("overtime_requests")
      .select("*")
      .eq("employee_id", user!.id)
      .order("date", { ascending: false })
      .returns<OvertimeRequest[]>(),
    isAdmin
      ? supabase
          .from("overtime_requests")
          .select("*, employee:profiles!overtime_requests_employee_id_fkey(full_name)")
          .eq("status", "pending")
          .order("date", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const pendingApprovals: (OvertimeRequest & { employee: { full_name: string } | null })[] =
    pendingApprovalsResult.data ?? [];

  return (
    <div className="space-y-6">
      <OvertimeSummaryCards requests={myRequests ?? []} />

      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>My overtime entries</CardTitle>
          <LogOvertimeDialog />
        </CardHeader>
        <CardContent>
          <MyOvertimeTable requests={myRequests ?? []} />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <OvertimeApprovalsTable requests={pendingApprovals} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
