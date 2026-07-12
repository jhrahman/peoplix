import { Badge } from "@/components/ui/badge";
import type { Holiday } from "@/lib/types";
import { HolidayFormDialog } from "@/components/holidays/holiday-form-dialog";
import { DeleteHolidayButton } from "@/components/holidays/delete-holiday-button";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short" });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export function HolidaysList({
  holidays,
  isStaff,
}: {
  holidays: Holiday[];
  isStaff: boolean;
}) {
  if (holidays.length === 0) {
    return <p className="text-sm text-muted-foreground">No holidays added yet.</p>;
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const groups = new Map<string, Holiday[]>();
  for (const holiday of holidays) {
    const key = MONTH_YEAR_FORMAT.format(new Date(`${holiday.date}T00:00:00`));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(holiday);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([month, monthHolidays]) => (
        <div key={month}>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">{month}</h3>
          <div className="space-y-2">
            {monthHolidays.map((holiday) => {
              const dateObj = new Date(`${holiday.date}T00:00:00`);
              const isPast = holiday.date < todayIso;
              return (
                <div
                  key={holiday.id}
                  data-testid={`holiday-row-${holiday.id}`}
                  className="glass-interactive flex items-center gap-4 rounded-xl bg-card/40 p-3"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary/10 py-1.5 text-primary">
                    <span className="text-xs font-medium uppercase">
                      {MONTH_FORMAT.format(dateObj)}
                    </span>
                    <span className="text-lg font-heading font-semibold leading-none">
                      {dateObj.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={isPast ? "text-muted-foreground line-through" : "font-medium"}>
                      {holiday.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {WEEKDAY_FORMAT.format(dateObj)}
                      {holiday.is_recurring && " · Repeats yearly"}
                    </p>
                  </div>
                  {holiday.is_recurring && (
                    <Badge variant="secondary" className="shrink-0">
                      Yearly
                    </Badge>
                  )}
                  {isStaff && (
                    <div className="flex shrink-0 items-center gap-1">
                      <HolidayFormDialog holiday={holiday} />
                      <DeleteHolidayButton id={holiday.id} name={holiday.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
