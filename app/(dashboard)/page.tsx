import { CalendarDays, ClipboardList, PartyPopper, Users, Clock, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureLeaveBalance } from "@/lib/leave";
import { hoursWorked } from "@/lib/attendance";
import type { Attendance, Holiday, OvertimeRequest, Profile } from "@/lib/types";
import { StatTile } from "@/components/dashboard/stat-tile";
import { LeaveBalanceMeters } from "@/components/dashboard/leave-balance-meters";
import { RoleInfoCard } from "@/components/dashboard/role-info-card";
import { WeeklyAttendanceChart, type DayHours } from "@/components/dashboard/weekly-attendance-chart";
import { UpcomingHolidays } from "@/components/dashboard/upcoming-holidays";

const DHAKA_TIME_ZONE = "Asia/Dhaka";
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: DHAKA_TIME_ZONE,
});
const DATE_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: DHAKA_TIME_ZONE,
});
const ISO_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA_TIME_ZONE });

// Matches attendance.date, which is keyed to the Bangladesh calendar day.
function isoDate(d: Date) {
  return ISO_DATE_FORMAT.format(d);
}

export default async function DashboardPage() {
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
  const isAdmin = profile?.role === "admin";
  const year = new Date().getFullYear();
  const today = new Date();
  const todayIso = isoDate(today);
  const currentMonth = todayIso.slice(0, 7);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartIso = isoDate(weekStart);

  const [{ data: weekAttendance }, { data: upcomingHolidays }, balance, { data: myOvertime }] =
    await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user!.id)
        .gte("date", weekStartIso)
        .returns<Attendance[]>(),
      supabase
        .from("holidays")
        .select("*")
        .gte("date", todayIso)
        .order("date")
        .limit(3)
        .returns<Holiday[]>(),
      ensureLeaveBalance(createAdminClient(), user!.id, year),
      supabase
        .from("overtime_requests")
        .select("*")
        .eq("employee_id", user!.id)
        .returns<OvertimeRequest[]>(),
    ]);

  const pendingOvertimeOwn = (myOvertime ?? []).filter((o) => o.status === "pending").length;
  const approvedOvertimeHoursThisMonth = (myOvertime ?? [])
    .filter((o) => o.status === "approved" && o.date.slice(0, 7) === currentMonth)
    .reduce((sum, o) => sum + o.hours, 0);

  const hoursByDate = new Map(
    (weekAttendance ?? []).map((a) => [a.date, hoursWorked(a.check_in, a.check_out)]),
  );

  const days: DayHours[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const date = isoDate(d);
    return {
      label: DAY_LABEL_FORMAT.format(d),
      dateLabel: DATE_LABEL_FORMAT.format(d),
      hours: hoursByDate.get(date) ?? 0,
    };
  });

  const weekTotalHours = days.reduce((sum, d) => sum + d.hours, 0);
  const leaveRemaining =
    balance.casual_total -
    balance.casual_used +
    (balance.sick_total - balance.sick_used) +
    (balance.annual_total - balance.annual_used);

  const nextHoliday = upcomingHolidays?.[0];
  const nextHolidayDays = nextHoliday
    ? Math.round(
        (new Date(`${nextHoliday.date}T00:00:00`).getTime() - new Date(todayIso).getTime()) /
          86_400_000,
      )
    : null;

  let pendingApprovals = 0;
  let checkedInToday = 0;
  let totalEmployees = 0;
  let pendingOvertimeApprovals = 0;

  if (isStaff) {
    const [{ count: pendingCount }, { count: checkedInCount }, { count: employeeCount }] =
      await Promise.all([
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("date", todayIso)
          .not("check_in", "is", null),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
    pendingApprovals = pendingCount ?? 0;
    checkedInToday = checkedInCount ?? 0;
    totalEmployees = employeeCount ?? 0;
  }

  if (isAdmin) {
    const { count: pendingOvertimeCount } = await supabase
      .from("overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingOvertimeApprovals = pendingOvertimeCount ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {profile?.role} · {profile?.department ?? "No department set"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Hours this week"
          value={`${weekTotalHours.toFixed(1)}h`}
          sublabel="Last 7 days"
          accent
        />
        <StatTile
          icon={Timer}
          label="Overtime this month"
          value={`${approvedOvertimeHoursThisMonth}h`}
          sublabel={
            pendingOvertimeOwn > 0
              ? `${pendingOvertimeOwn} pending review`
              : "Approved hours"
          }
        />
        <StatTile
          icon={CalendarDays}
          label="Leave remaining"
          value={`${leaveRemaining} days`}
          sublabel="Across casual, sick, annual"
        />
        <StatTile
          icon={PartyPopper}
          label="Next holiday"
          value={
            nextHoliday
              ? nextHolidayDays === 0
                ? "Today"
                : nextHolidayDays === 1
                  ? "Tomorrow"
                  : `In ${nextHolidayDays} days`
              : "None scheduled"
          }
          sublabel={nextHoliday?.name}
        />
      </div>

      {isStaff && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            icon={ClipboardList}
            label="Pending approvals"
            value={String(pendingApprovals)}
            sublabel="Leave requests awaiting review"
          />
          <StatTile
            icon={Users}
            label="Checked in today"
            value={`${checkedInToday} / ${totalEmployees}`}
            sublabel="Employees"
          />
          {isAdmin && (
            <StatTile
              icon={Timer}
              label="Overtime approvals"
              value={String(pendingOvertimeApprovals)}
              sublabel="Entries awaiting review"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaveBalanceMeters balance={balance} />
        <RoleInfoCard profile={profile!} />
      </div>

      <WeeklyAttendanceChart days={days} />

      <UpcomingHolidays holidays={upcomingHolidays ?? []} />
    </div>
  );
}
