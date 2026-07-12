"use client";

import { ExportMenu } from "@/components/import-export/export-menu";
import { ImportDialog } from "@/components/import-export/import-dialog";
import type { Column } from "@/lib/import-export";
import { leaveDays } from "@/lib/leave";
import type { LeaveRequest, LeaveType } from "@/lib/types";

const EXPORT_COLUMNS: Column[] = [
  { key: "employee", label: "Employee" },
  { key: "leave_type", label: "Type" },
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
  { key: "days", label: "Days" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
];

const IMPORT_COLUMNS: Column[] = [
  { key: "employee_email", label: "Employee email" },
  { key: "leave_type", label: "Type" },
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
  { key: "reason", label: "Reason" },
];

const LEAVE_TYPES: LeaveType[] = ["casual", "sick", "annual"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type LeaveImportRow = {
  employee_email: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
};

function validateRow(raw: Record<string, string>) {
  const employee_email = raw.employee_email?.trim();
  const leave_type = raw.leave_type?.trim().toLowerCase() as LeaveType;
  const start_date = raw.start_date?.trim();
  const end_date = raw.end_date?.trim();

  if (!employee_email || !/^\S+@\S+\.\S+$/.test(employee_email)) {
    return { error: "Invalid employee email" };
  }
  if (!LEAVE_TYPES.includes(leave_type)) {
    return { error: `Type must be one of ${LEAVE_TYPES.join(", ")}` };
  }
  if (!start_date || !DATE_RE.test(start_date)) return { error: "Start date must be YYYY-MM-DD" };
  if (!end_date || !DATE_RE.test(end_date)) return { error: "End date must be YYYY-MM-DD" };
  if (end_date < start_date) return { error: "End date is before start date" };

  return {
    data: {
      employee_email,
      leave_type,
      start_date,
      end_date,
      reason: raw.reason?.trim() ?? "",
    } satisfies LeaveImportRow,
  };
}

async function importRow(data: LeaveImportRow) {
  const res = await fetch("/api/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) return { ok: true };
  const json = await res.json().catch(() => ({}));
  return { ok: false, error: json.error ?? "Failed" };
}

export function LeaveImportExport({
  requests,
}: {
  requests: (LeaveRequest & { employee: { full_name: string } | null })[];
}) {
  const exportRows = requests.map((r) => ({
    employee: r.employee?.full_name ?? "",
    leave_type: r.leave_type,
    start_date: r.start_date,
    end_date: r.end_date,
    days: leaveDays(r.start_date, r.end_date),
    status: r.status,
    reason: r.reason ?? "",
  }));

  return (
    <div className="flex gap-2">
      <ImportDialog
        resourceLabel="leave requests"
        templateColumns={IMPORT_COLUMNS}
        templateExample={{
          employee_email: "jane@example.com",
          leave_type: "casual",
          start_date: "2026-03-10",
          end_date: "2026-03-12",
          reason: "Family event",
        }}
        previewColumns={IMPORT_COLUMNS}
        validateRow={validateRow}
        importRow={importRow}
      />
      <ExportMenu filenameBase="leave-requests" rows={exportRows} columns={EXPORT_COLUMNS} />
    </div>
  );
}
