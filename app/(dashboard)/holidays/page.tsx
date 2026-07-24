import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getHolidaysList } from "@/lib/holidays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HolidaysList } from "@/components/holidays/holidays-list";
import { HolidayFormDialog } from "@/components/holidays/holiday-form-dialog";
import { HolidaysImportExport } from "@/components/holidays/holidays-import-export";
import { SeedDefaultHolidaysButton } from "@/components/holidays/seed-default-holidays-button";

export default async function HolidaysPage() {
  const { profile } = await getCurrentProfile();

  const isStaff = Boolean(profile && ["admin", "hr"].includes(profile.role));

  const holidays = await getHolidaysList();

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Holidays</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <SeedDefaultHolidaysButton />
          {isStaff && (
            <>
              <HolidaysImportExport holidays={holidays} />
              <HolidayFormDialog />
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <HolidaysList holidays={holidays} isStaff={isStaff} />
      </CardContent>
    </Card>
  );
}
