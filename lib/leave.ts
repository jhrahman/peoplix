import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveBalance, LeaveType } from "@/lib/types";

// Counts weekdays only - Saturdays and Sundays are the default weekend and
// don't consume leave balance, since start/end date pickers already block
// picking a weekend as either endpoint.
export function leaveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  let days = 0;
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days++;
  }
  return days;
}

export const LEAVE_TYPE_BALANCE_COLUMNS: Record<
  LeaveType,
  { total: keyof LeaveBalance; used: keyof LeaveBalance }
> = {
  casual: { total: "casual_total", used: "casual_used" },
  sick: { total: "sick_total", used: "sick_used" },
  annual: { total: "annual_total", used: "annual_used" },
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: "Casual",
  sick: "Sick",
  annual: "Annual",
};

export function remainingLeaveDays(balance: LeaveBalance, leaveType: LeaveType) {
  const { total, used } = LEAVE_TYPE_BALANCE_COLUMNS[leaveType];
  return (balance[total] as number) - (balance[used] as number);
}

export async function ensureLeaveBalance(
  client: SupabaseClient,
  employeeId: string,
  year: number,
) {
  const { data: existing } = await client
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("year", year)
    .maybeSingle<LeaveBalance>();

  if (existing) return existing;

  const { data: created, error } = await client
    .from("leave_balances")
    .insert({ employee_id: employeeId, year })
    .select()
    .single<LeaveBalance>();

  if (error) throw new Error(error.message);
  return created;
}

// Used to flag "on leave today" in the Team Directory - deliberately not
// cached (unlike the directory's profile list): approval status can change
// at any moment and the relevant date rolls over daily, so staleness here
// would show wrong/misleading status rather than just a slow-to-update name.
export async function getEmployeeIdsOnApprovedLeave(
  client: SupabaseClient,
  dateIso: string,
): Promise<string[]> {
  const { data } = await client
    .from("leave_requests")
    .select("employee_id")
    .eq("status", "approved")
    .lte("start_date", dateIso)
    .gte("end_date", dateIso);

  return (data ?? []).map((r) => r.employee_id as string);
}
