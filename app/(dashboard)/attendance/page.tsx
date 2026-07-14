import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Attendance } from "@/lib/types";
import { todayInDhaka } from "@/lib/attendance";
import { CheckInOutCard } from "@/components/attendance/check-in-out-card";
import { AttendanceHistoryTable } from "@/components/attendance/attendance-history-table";
import { AttendanceHistoryFilter } from "@/components/attendance/attendance-history-filter";
import { TeamAttendanceTodaySection } from "@/components/attendance/team-attendance-today-section";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CARD_SKELETON = <div className="glass-panel h-56 animate-pulse rounded-xl" />;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from && ISO_DATE.test(from) ? from : undefined;
  const toDate = to && ISO_DATE.test(to) ? to : undefined;

  const { supabase, user, profile } = await getCurrentProfile();

  const isStaff = Boolean(profile && ["admin", "hr"].includes(profile.role));
  const today = todayInDhaka();

  let historyQuery = supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", user!.id)
    .order("date", { ascending: false });

  if (fromDate) {
    historyQuery = historyQuery.gte("date", fromDate);
  }
  if (toDate) {
    historyQuery = historyQuery.lte("date", toDate);
  }
  if (!fromDate && !toDate) {
    historyQuery = historyQuery.limit(30);
  }

  const [{ data: todayRecord }, { data: history }] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", user!.id)
      .eq("date", today)
      .maybeSingle<Attendance>(),
    historyQuery.returns<Attendance[]>(),
  ]);

  return (
    <div className="space-y-6">
      <CheckInOutCard today={todayRecord ?? null} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>My history</CardTitle>
          <Suspense fallback={null}>
            <AttendanceHistoryFilter />
          </Suspense>
        </CardHeader>
        <CardContent>
          <AttendanceHistoryTable records={history ?? []} />
        </CardContent>
      </Card>

      {/* Staff-only section streams in independently so a non-staff user's
          own history (above) never waits on this join. */}
      {isStaff && (
        <Suspense fallback={CARD_SKELETON}>
          <TeamAttendanceTodaySection today={today} />
        </Suspense>
      )}
    </div>
  );
}
