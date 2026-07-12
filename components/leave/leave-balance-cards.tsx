import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaveBalance } from "@/lib/types";

const ROWS: { label: string; total: keyof LeaveBalance; used: keyof LeaveBalance }[] = [
  { label: "Casual", total: "casual_total", used: "casual_used" },
  { label: "Sick", total: "sick_total", used: "sick_used" },
  { label: "Annual", total: "annual_total", used: "annual_used" },
];

export function LeaveBalanceCards({ balance }: { balance: LeaveBalance }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {ROWS.map(({ label, total, used }) => {
        const totalValue = balance[total] as number;
        const usedValue = balance[used] as number;
        const remaining = totalValue - usedValue;
        const overLimit = remaining < 0;
        return (
          <Card key={label} className="glass-interactive">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label} leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight",
                  overLimit ? "text-destructive" : "text-primary",
                )}
              >
                {overLimit ? (
                  <>
                    {Math.abs(remaining)}
                    <span className="text-sm font-normal text-muted-foreground"> days over</span>
                  </>
                ) : (
                  <>
                    {remaining}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {totalValue} left
                    </span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
