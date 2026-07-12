"use client";

import { ExportMenu } from "@/components/import-export/export-menu";
import { ImportDialog } from "@/components/import-export/import-dialog";
import type { Column } from "@/lib/import-export";
import type { Profile, UserRole } from "@/lib/types";

const COLUMNS: Column[] = [
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "role", label: "Role" },
];

const ROLES: UserRole[] = ["admin", "hr", "employee"];

type EmployeeImportRow = {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: UserRole;
};

function validateRow(raw: Record<string, string>) {
  const full_name = raw.full_name?.trim();
  const email = raw.email?.trim();
  const role = (raw.role?.trim().toLowerCase() || "employee") as UserRole;

  if (!full_name) return { error: "Missing full name" };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Invalid email" };
  if (!ROLES.includes(role)) return { error: `Role must be one of ${ROLES.join(", ")}` };

  return {
    data: {
      full_name,
      email,
      phone: raw.phone?.trim() ?? "",
      department: raw.department?.trim() ?? "",
      designation: raw.designation?.trim() ?? "",
      role,
    } satisfies EmployeeImportRow,
  };
}

async function importRow(data: EmployeeImportRow) {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) return { ok: true };
  const json = await res.json().catch(() => ({}));
  return { ok: false, error: json.error ?? "Failed" };
}

export function EmployeesImportExport({ employees }: { employees: Profile[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ImportDialog
        resourceLabel="employees"
        templateColumns={COLUMNS}
        templateExample={{
          full_name: "Jane Doe",
          email: "jane@example.com",
          phone: "+880 1XXXXXXXXX",
          department: "Engineering",
          designation: "Software Engineer",
          role: "employee",
        }}
        previewColumns={COLUMNS}
        validateRow={validateRow}
        importRow={importRow}
      />
      <ExportMenu filenameBase="employees" rows={employees} columns={COLUMNS} />
    </div>
  );
}
