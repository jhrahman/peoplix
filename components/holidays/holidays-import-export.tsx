"use client";

import { ExportMenu } from "@/components/import-export/export-menu";
import { ImportDialog } from "@/components/import-export/import-dialog";
import type { Column } from "@/lib/import-export";
import type { Holiday } from "@/lib/types";

const COLUMNS: Column[] = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "is_recurring", label: "Recurring" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRUTHY = new Set(["true", "yes", "1", "y"]);

type HolidayImportRow = { name: string; date: string; is_recurring: boolean };

function validateRow(raw: Record<string, string>) {
  const name = raw.name?.trim();
  const date = raw.date?.trim();

  if (!name) return { error: "Missing name" };
  if (!date || !DATE_RE.test(date)) return { error: "Date must be YYYY-MM-DD" };

  return {
    data: {
      name,
      date,
      is_recurring: TRUTHY.has(raw.is_recurring?.trim().toLowerCase() ?? ""),
    } satisfies HolidayImportRow,
  };
}

async function importRow(data: HolidayImportRow) {
  const res = await fetch("/api/holidays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) return { ok: true };
  const json = await res.json().catch(() => ({}));
  return { ok: false, error: json.error ?? "Failed" };
}

export function HolidaysImportExport({ holidays }: { holidays: Holiday[] }) {
  return (
    <div className="flex gap-2">
      <ImportDialog
        resourceLabel="holidays"
        templateColumns={COLUMNS}
        templateExample={{ name: "Independence Day", date: "2026-03-26", is_recurring: "true" }}
        previewColumns={COLUMNS}
        validateRow={validateRow}
        importRow={importRow}
      />
      <ExportMenu filenameBase="holidays" rows={holidays} columns={COLUMNS} />
    </div>
  );
}
