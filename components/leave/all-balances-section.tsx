import { createClient } from "@/lib/supabase/server";
import type { LeaveBalanceSummary } from "@/lib/types";
import { AllBalancesCard } from "@/components/leave/all-balances-card";

export async function AllBalancesSection({ year }: { year: number }) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leave_balances")
    .select(
      "year, casual_total, casual_used, sick_total, sick_used, annual_total, annual_used, employee:profiles!leave_balances_employee_id_fkey(full_name)",
    )
    .eq("year", year)
    .order("employee_id")
    .returns<(LeaveBalanceSummary & { employee: { full_name: string } | null })[]>();

  const balances = data ?? [];

  return <AllBalancesCard balances={balances} />;
}
