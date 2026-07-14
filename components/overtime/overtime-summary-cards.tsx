import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OvertimeRequestSummary } from "@/lib/types";
import { todayInDhaka } from "@/lib/attendance";

export function OvertimeSummaryCards({ requests }: { requests: OvertimeRequestSummary[] }) {
  const currentMonth = todayInDhaka().slice(0, 7);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedHoursThisMonth = requests
    .filter((r) => r.status === "approved" && r.date.slice(0, 7) === currentMonth)
    .reduce((sum, r) => sum + r.hours, 0);
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="glass-interactive">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Pending review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight text-primary" data-testid="overtime-summary-pending">
            {pendingCount}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              {pendingCount === 1 ? "entry" : "entries"}
            </span>
          </p>
        </CardContent>
      </Card>
      <Card className="glass-interactive">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Approved this month</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="text-2xl font-semibold tracking-tight text-primary"
            data-testid="overtime-summary-approved-hours"
          >
            {approvedHoursThisMonth}
            <span className="text-sm font-normal text-muted-foreground"> hours</span>
          </p>
        </CardContent>
      </Card>
      <Card className="glass-interactive">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="text-2xl font-semibold tracking-tight text-destructive"
            data-testid="overtime-summary-rejected"
          >
            {rejectedCount}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              {rejectedCount === 1 ? "entry" : "entries"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
