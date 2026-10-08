import { createAdminClient } from "@/lib/supabase/admin";
import { monthDayOf, type SharedBirthday } from "@/lib/celebrations";

// Service-role on purpose: employee_birthdays lets a user read only their own
// row (see 0017), which is what keeps everyone's date of birth private. The
// team-facing features only need "whose birthday is it, by day and month", so
// this reads the table server-side and returns just that - the year is dropped
// right here and never reaches a component or an API response. People who
// turned off "share with team" are excluded.
export async function getSharedBirthdays(): Promise<SharedBirthday[]> {
  const { data } = await createAdminClient()
    .from("employee_birthdays")
    .select("employee_id, date_of_birth")
    .eq("share_with_team", true)
    .returns<{ employee_id: string; date_of_birth: string }[]>();

  return (data ?? []).map((row) => ({ id: row.employee_id, ...monthDayOf(row.date_of_birth) }));
}
