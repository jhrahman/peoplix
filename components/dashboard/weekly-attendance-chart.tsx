import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type DayHours = { label: string; dateLabel: string; hours: number };

export function WeeklyAttendanceChart({ days }: { days: DayHours[] }) {
  const scaleMax = Math.max(8, ...days.map((d) => d.hours));
  const hasData = days.some((d) => d.hours > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours worked this week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-2 border-b border-border">
          {days.map((day) => {
            const heightPercent = (day.hours / scaleMax) * 100;
            return (
              <Tooltip key={day.dateLabel}>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 flex-col items-center justify-end gap-1.5 pb-0.5">
                    <div className="flex h-28 w-full max-w-6 items-end justify-center">
                      <div
                        className="w-full max-w-6 rounded-t-sm bg-primary transition-all"
                        style={{ height: `${Math.max(2, heightPercent)}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {day.dateLabel} — {day.hours > 0 ? `${day.hours.toFixed(1)}h` : "No record"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-2">
          {days.map((day) => (
            <span
              key={day.label + day.dateLabel}
              className="flex-1 text-center text-xs text-muted-foreground"
            >
              {day.label}
            </span>
          ))}
        </div>
        {!hasData && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            No attendance recorded this week yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
