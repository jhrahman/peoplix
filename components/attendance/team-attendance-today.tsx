import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";

type AttendanceWithEmployee = Attendance & { employee: { full_name: string } | null };

export function TeamAttendanceToday({ records }: { records: AttendanceWithEmployee[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">No one has checked in yet today.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Check in</TableHead>
            <TableHead>Check out</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.employee?.full_name ?? "—"}</TableCell>
              <TableCell>{formatTime(record.check_in)}</TableCell>
              <TableCell>{formatTime(record.check_out)}</TableCell>
              <TableCell>
                <Badge variant={record.check_out ? "secondary" : "default"}>
                  {record.check_out ? "Done" : "Checked in"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
