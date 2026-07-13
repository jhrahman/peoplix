import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Attendance } from "@/lib/types";
import { todayInDhaka } from "@/lib/attendance";
import { CheckInOutCard } from "@/components/attendance/check-in-out-card";
import { AttendanceHistoryTable } from "@/components/attendance/attendance-history-table";
import { AttendanceHistoryFilter } from "@/components/attendance/attendance-history-filter";
import { TeamAttendanceToday } from "@/components/attendance/team-attendance-today";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

  const [{ data: todayRecord }, { data: history }, teamTodayResult] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", user!.id)
      .eq("date", today)
      .maybeSingle<Attendance>(),
    historyQuery.returns<Attendance[]>(),
    isStaff
      ? supabase
          .from("attendance")
          .select("*, employee:profiles!attendance_employee_id_fkey(full_name)")
          .eq("date", today)
          .order("check_in")
      : Promise.resolve({ data: null }),
  ]);

  const teamToday: (Attendance & { employee: { full_name: string } | null })[] =
    teamTodayResult.data ?? [];

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

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Team attendance today</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamAttendanceToday records={teamToday} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
