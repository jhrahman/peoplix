import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Attendance } from "@/lib/types";
import { TeamAttendanceToday } from "@/components/attendance/team-attendance-today";

export async function TeamAttendanceTodaySection({ today }: { today: string }) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendance")
    .select("*, employee:profiles!attendance_employee_id_fkey(full_name)")
    .eq("date", today)
    .order("check_in")
    .returns<(Attendance & { employee: { full_name: string } | null })[]>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team attendance today</CardTitle>
      </CardHeader>
      <CardContent>
        <TeamAttendanceToday records={data ?? []} />
      </CardContent>
    </Card>
  );
}
