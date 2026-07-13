import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureLeaveBalance } from "@/lib/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveBalance, LeaveRequest } from "@/lib/types";
import { LeaveBalanceCards } from "@/components/leave/leave-balance-cards";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { MyLeaveTable } from "@/components/leave/my-leave-table";
import { ApprovalsTable } from "@/components/leave/approvals-table";
import { LeaveImportExport } from "@/components/leave/leave-import-export";
import { AllBalancesCard } from "@/components/leave/all-balances-card";

export default async function LeavePage() {
  const { supabase, user, profile } = await getCurrentProfile();

  const isStaff = profile && ["admin", "hr"].includes(profile.role);
  const year = new Date().getFullYear();

  // Own balance is created here with the admin client, but only ever for the
  // signed-in user's own id (derived from the session, not client input).
  const [balance, { data: myRequests }, pendingApprovalsResult, allBalancesResult] =
    await Promise.all([
      ensureLeaveBalance(createAdminClient(), user!.id, year),
      supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", user!.id)
        .order("created_at", { ascending: false })
        .returns<LeaveRequest[]>(),
      isStaff
        ? supabase
            .from("leave_requests")
            .select("*, employee:profiles!leave_requests_employee_id_fkey(full_name)")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
      isStaff
        ? supabase
            .from("leave_balances")
            .select("*, employee:profiles!leave_balances_employee_id_fkey(full_name)")
            .eq("year", year)
            .order("employee_id")
        : Promise.resolve({ data: null }),
    ]);

  const pendingApprovals: (LeaveRequest & { employee: { full_name: string } | null })[] =
    pendingApprovalsResult.data ?? [];
  const allBalances: (LeaveBalance & { employee: { full_name: string } | null })[] =
    allBalancesResult.data ?? [];

  return (
    <div className="space-y-6">
      <LeaveBalanceCards balance={balance} />

      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>My leave requests</CardTitle>
          <ApplyLeaveDialog />
        </CardHeader>
        <CardContent>
          <MyLeaveTable requests={myRequests ?? []} />
        </CardContent>
      </Card>

      {isStaff && (
        <Card>
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Approvals</CardTitle>
            <LeaveImportExport requests={pendingApprovals} />
          </CardHeader>
          <CardContent>
            <ApprovalsTable requests={pendingApprovals} />
          </CardContent>
        </Card>
      )}

      {isStaff && <AllBalancesCard balances={allBalances} />}
    </div>
  );
}
