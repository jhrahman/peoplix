import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaveBalance } from "@/lib/types";

const ROWS: { label: string; total: keyof LeaveBalance; used: keyof LeaveBalance }[] = [
  { label: "Casual", total: "casual_total", used: "casual_used" },
  { label: "Sick", total: "sick_total", used: "sick_used" },
  { label: "Annual", total: "annual_total", used: "annual_used" },
];

export function LeaveBalanceMeters({ balance }: { balance: LeaveBalance }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ROWS.map(({ label, total, used }) => {
          const totalValue = balance[total] as number;
          const usedValue = balance[used] as number;
          const remaining = totalValue - usedValue;
          const percentUsed = totalValue > 0 ? Math.min(100, (usedValue / totalValue) * 100) : 0;
          const overLimit = remaining < 0;

          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">
                  {overLimit ? (
                    <span className="text-destructive">{Math.abs(remaining)} over</span>
                  ) : (
                    <>
                      {remaining} / {totalValue} left
                    </>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-primary/15">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overLimit ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${overLimit ? 100 : percentUsed}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
