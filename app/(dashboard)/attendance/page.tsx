import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Attendance, Profile } from "@/lib/types";
import { CheckInOutCard } from "@/components/attendance/check-in-out-card";
import { AttendanceHistoryTable } from "@/components/attendance/attendance-history-table";
import { TeamAttendanceToday } from "@/components/attendance/team-attendance-today";

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const isStaff = Boolean(profile && ["admin", "hr"].includes(profile.role));
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayRecord } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", user!.id)
    .eq("date", today)
    .maybeSingle<Attendance>();

  const { data: history } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", user!.id)
    .order("date", { ascending: false })
    .limit(30)
    .returns<Attendance[]>();

  let teamToday: (Attendance & { employee: { full_name: string } | null })[] = [];
  if (isStaff) {
    const { data } = await supabase
      .from("attendance")
      .select("*, employee:profiles!attendance_employee_id_fkey(full_name)")
      .eq("date", today)
      .order("check_in");
    teamToday = data ?? [];
  }

  return (
    <div className="space-y-6">
      <CheckInOutCard today={todayRecord ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>My history</CardTitle>
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
