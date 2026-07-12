import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Holiday, Profile } from "@/lib/types";
import { HolidaysList } from "@/components/holidays/holidays-list";
import { HolidayFormDialog } from "@/components/holidays/holiday-form-dialog";

export default async function HolidaysPage() {
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

  const { data: holidays } = await supabase
    .from("holidays")
    .select("*")
    .order("date")
    .returns<Holiday[]>();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Holidays</CardTitle>
        {isStaff && <HolidayFormDialog />}
      </CardHeader>
      <CardContent>
        <HolidaysList holidays={holidays ?? []} isStaff={isStaff} />
      </CardContent>
    </Card>
  );
}
