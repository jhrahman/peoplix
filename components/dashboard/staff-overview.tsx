import { ClipboardList, Timer, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/dashboard/stat-tile";

const ISO_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });

export async function StaffOverview({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient();
  const todayIso = ISO_DATE_FORMAT.format(new Date());

  const [
    { count: pendingCount },
    { count: checkedInCount },
    { count: employeeCount },
    { count: pendingOvertimeCount },
  ] = await Promise.all([
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
    isAdmin
      ? supabase
          .from("overtime_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile
        icon={ClipboardList}
        label="Pending approvals"
        value={String(pendingCount ?? 0)}
        sublabel="Leave requests awaiting review"
      />
      <StatTile
        icon={Users}
        label="Checked in today"
        value={`${checkedInCount ?? 0} / ${employeeCount ?? 0}`}
        sublabel="Employees"
      />
      {isAdmin && (
        <StatTile
          icon={Timer}
          label="Overtime approvals"
          value={String(pendingOvertimeCount ?? 0)}
          sublabel="Entries awaiting review"
        />
      )}
    </div>
  );
}
