import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveBalance, LeaveType } from "@/lib/types";

export function leaveDays(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff + 1;
}

export const LEAVE_TYPE_BALANCE_COLUMNS: Record<
  LeaveType,
  { total: keyof LeaveBalance; used: keyof LeaveBalance }
> = {
  casual: { total: "casual_total", used: "casual_used" },
  sick: { total: "sick_total", used: "sick_used" },
  annual: { total: "annual_total", used: "annual_used" },
};

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
