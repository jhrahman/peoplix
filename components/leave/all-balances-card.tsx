import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportMenu } from "@/components/import-export/export-menu";
import type { Column } from "@/lib/import-export";
import type { LeaveBalanceSummary } from "@/lib/types";

const COLUMNS: Column[] = [
  { key: "employee", label: "Employee" },
  { key: "year", label: "Year" },
  { key: "casual_remaining", label: "Casual left" },
  { key: "sick_remaining", label: "Sick left" },
  { key: "annual_remaining", label: "Annual left" },
];

export function AllBalancesCard({
  balances,
}: {
  balances: (LeaveBalanceSummary & { employee: { full_name: string } | null })[];
}) {
  const rows = balances.map((b) => ({
    employee: b.employee?.full_name ?? "",
    year: b.year,
    casual_remaining: b.casual_total - b.casual_used,
    sick_remaining: b.sick_total - b.sick_used,
    annual_remaining: b.annual_total - b.annual_used,
  }));

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>All balances</CardTitle>
        <ExportMenu filenameBase="leave-balances" rows={rows} columns={COLUMNS} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No balances yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    {COLUMNS.map((c) => (
                      <TableCell key={c.key}>{row[c.key as keyof typeof row]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
