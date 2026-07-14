import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OvertimeRequestSummary } from "@/lib/types";
import { OvertimeSummaryCards } from "@/components/overtime/overtime-summary-cards";
import { LogOvertimeDialog } from "@/components/overtime/log-overtime-dialog";
import { MyOvertimeTable } from "@/components/overtime/my-overtime-table";
import { OvertimeApprovalsSection } from "@/components/overtime/approvals-section";

const CARD_SKELETON = <div className="glass-panel h-56 animate-pulse rounded-xl" />;

export default async function OvertimePage() {
  const { supabase, user, profile } = await getCurrentProfile();

  const isAdmin = profile?.role === "admin";

  const { data: myRequests } = await supabase
    .from("overtime_requests")
    .select("id, date, hours, reason, status")
    .eq("employee_id", user!.id)
    .order("date", { ascending: false })
    .limit(100)
    .returns<OvertimeRequestSummary[]>();

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

      {/* Admin-only section streams in independently so a non-admin's own
          data (above) never waits on this join. */}
      {isAdmin && (
        <Suspense fallback={CARD_SKELETON}>
          <OvertimeApprovalsSection />
        </Suspense>
      )}
    </div>
  );
}
