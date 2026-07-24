import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureLeaveBalance } from "@/lib/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveRequestSummary } from "@/lib/types";
import { LeaveBalanceCards } from "@/components/leave/leave-balance-cards";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { MyLeaveTable } from "@/components/leave/my-leave-table";
import { ApprovalsSection } from "@/components/leave/approvals-section";
import { AllBalancesSection } from "@/components/leave/all-balances-section";

const CARD_SKELETON = <div className="glass-panel h-56 animate-pulse rounded-xl" />;

export default async function LeavePage() {
  const { supabase, user, profile } = await getCurrentProfile();

  const isStaff = profile && ["admin", "hr"].includes(profile.role);
  const year = new Date().getFullYear();

  // Own balance is created here with the admin client, but only ever for the
  // signed-in user's own id (derived from the session, not client input).
  const [balance, { data: myRequests }] = await Promise.all([
    ensureLeaveBalance(createAdminClient(), user!.id, year),
    supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, reason, status")
      .eq("employee_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<LeaveRequestSummary[]>(),
  ]);

  return (
    <div className="space-y-6">
      <LeaveBalanceCards balance={balance} />

      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>My leave requests</CardTitle>
          <ApplyLeaveDialog balance={balance} />
        </CardHeader>
        <CardContent>
          <MyLeaveTable requests={myRequests ?? []} balance={balance} />
        </CardContent>
      </Card>

      {/* Staff-only sections stream in independently so a non-staff user's
          own data (above) never waits on these admin/HR-only joins. */}
      {isStaff && (
        <Suspense fallback={CARD_SKELETON}>
          <ApprovalsSection />
        </Suspense>
      )}

      {isStaff && (
        <Suspense fallback={CARD_SKELETON}>
          <AllBalancesSection year={year} />
        </Suspense>
      )}
    </div>
  );
}
