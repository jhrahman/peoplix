import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, formatTime, todayInDhaka } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";
import { EditAttendanceDialog } from "@/components/attendance/edit-attendance-dialog";
import { DeleteAttendanceDialog } from "@/components/attendance/delete-attendance-dialog";

export function AttendanceHistoryTable({ records }: { records: Attendance[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance history for this range.</p>;
  }

  const today = todayInDhaka();

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Check in</TableHead>
            <TableHead>Check out</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} data-testid={`attendance-row-${record.id}`}>
              <TableCell>{record.date}</TableCell>
              <TableCell>{formatTime(record.check_in)}</TableCell>
              <TableCell>{formatTime(record.check_out)}</TableCell>
              <TableCell>{formatDuration(record.check_in, record.check_out)}</TableCell>
              <TableCell className="text-right">
                <EditAttendanceDialog record={record} />
                {record.date === today && <DeleteAttendanceDialog record={record} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
