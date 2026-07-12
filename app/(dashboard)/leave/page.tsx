import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureLeaveBalance } from "@/lib/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveRequest, Profile } from "@/lib/types";
import { LeaveBalanceCards } from "@/components/leave/leave-balance-cards";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { MyLeaveTable } from "@/components/leave/my-leave-table";
import { ApprovalsTable } from "@/components/leave/approvals-table";

export default async function LeavePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const isStaff = profile && ["admin", "hr"].includes(profile.role);
  const year = new Date().getFullYear();

  // Own balance is created here with the admin client, but only ever for the
  // signed-in user's own id (derived from the session, not client input).
  const balance = await ensureLeaveBalance(createAdminClient(), user!.id, year);

  const { data: myRequests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<LeaveRequest[]>();

  let pendingApprovals: (LeaveRequest & { employee: { full_name: string } | null })[] = [];
  if (isStaff) {
    const { data } = await supabase
      .from("leave_requests")
      .select("*, employee:profiles!leave_requests_employee_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pendingApprovals = data ?? [];
  }

  return (
    <div className="space-y-6">
      <LeaveBalanceCards balance={balance} />

      <Card className="glass-panel">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>My leave requests</CardTitle>
          <ApplyLeaveDialog />
        </CardHeader>
        <CardContent>
          <MyLeaveTable requests={myRequests ?? []} />
        </CardContent>
      </Card>

      {isStaff && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalsTable requests={pendingApprovals} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
