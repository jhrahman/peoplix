import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Holiday } from "@/lib/types";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short" });

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function UpcomingHolidays({ holidays }: { holidays: Holiday[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming holidays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming holidays scheduled.</p>
        ) : (
          holidays.map((holiday) => {
            const dateObj = new Date(`${holiday.date}T00:00:00`);
            const days = daysUntil(holiday.date);
            return (
              <div key={holiday.id} className="flex items-center gap-3 rounded-lg bg-card/40 p-2">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-primary/10 py-1 text-primary">
                  <span className="text-[0.65rem] font-medium uppercase">
                    {MONTH_FORMAT.format(dateObj)}
                  </span>
                  <span className="font-heading text-base font-semibold leading-none">
                    {dateObj.getDate()}
                  </span>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{holiday.name}</p>
                <Badge variant="secondary" className="shrink-0">
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
