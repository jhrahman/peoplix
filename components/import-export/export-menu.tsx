"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCsv, exportXlsx, type Column } from "@/lib/import-export";

export function ExportMenu({
  filenameBase,
  rows,
  columns,
}: {
  filenameBase: string;
  rows: Record<string, unknown>[];
  columns: Column[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`export-trigger-${filenameBase}`}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => exportCsv(`${filenameBase}.csv`, rows, columns)}
          data-testid={`export-csv-${filenameBase}`}
        >
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportXlsx(`${filenameBase}.xlsx`, rows, columns)}
          data-testid={`export-xlsx-${filenameBase}`}
        >
          Export as XLSX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
