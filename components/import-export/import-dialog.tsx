"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadTemplate, parseSpreadsheetFile, type Column } from "@/lib/import-export";

type ParsedRow<T> = {
  raw: Record<string, string>;
  data?: T;
  error?: string;
  status: "pending" | "importing" | "success" | "failed";
  resultError?: string;
};

export function ImportDialog<T>({
  resourceLabel,
  templateColumns,
  templateExample,
  previewColumns,
  validateRow,
  importRow,
}: {
  resourceLabel: string;
  templateColumns: Column[];
  templateExample: Record<string, unknown>;
  previewColumns: Column[];
  validateRow: (raw: Record<string, string>) => { data?: T; error?: string };
  importRow: (data: T) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow<T>[]>([]);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const validCount = rows.filter((r) => !r.error).length;
  const hasImported = rows.some((r) => r.status === "success" || r.status === "failed");
  const testSlug = resourceLabel.trim().toLowerCase().replace(/\s+/g, "-");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);

    try {
      const raw = await parseSpreadsheetFile(file);
      if (raw.length === 0) {
        setParseError("No rows found in that file.");
        setRows([]);
        return;
      }
      setRows(
        raw.map((r) => {
          const { data, error } = validateRow(r);
          return { raw: r, data, error, status: "pending" as const };
        }),
      );
    } catch {
      setParseError("Couldn't read that file. Make sure it's a valid CSV or XLSX.");
      setRows([]);
    }
  }

  async function handleImport() {
    setImporting(true);

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].error) continue;
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "importing" } : r)),
      );
      const result = await importRow(rows[i].data!);
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === i
            ? { ...r, status: result.ok ? "success" : "failed", resultError: result.error }
            : r,
        ),
      );
    }

    setImporting(false);
    router.refresh();
  }

  function reset() {
    setRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`import-trigger-${testSlug}`}>
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {resourceLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={() =>
                downloadTemplate(`${resourceLabel}-template.csv`, templateColumns, templateExample)
              }
              data-testid={`import-download-template-${testSlug}`}
            >
              Download template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="text-sm"
              data-testid={`import-file-input-${testSlug}`}
            />
          </div>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {rows.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {validCount} of {rows.length} row{rows.length === 1 ? "" : "s"} ready to import.
              </p>
              <div className="max-h-72 overflow-auto rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewColumns.map((c) => (
                        <TableHead key={c.key}>{c.label}</TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        {previewColumns.map((c) => (
                          <TableCell key={c.key} className="max-w-40 truncate">
                            {row.raw[c.key] ?? ""}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.status === "pending" && row.error && (
                            <Badge variant="destructive">{row.error}</Badge>
                          )}
                          {row.status === "pending" && !row.error && (
                            <Badge variant="secondary">Ready</Badge>
                          )}
                          {row.status === "importing" && (
                            <Badge variant="secondary">Importing…</Badge>
                          )}
                          {row.status === "success" && <Badge>Imported</Badge>}
                          {row.status === "failed" && (
                            <Badge variant="destructive">{row.resultError ?? "Failed"}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleImport}
            disabled={rows.length === 0 || validCount === 0 || importing || hasImported}
            data-testid={`import-confirm-${testSlug}`}
          >
            {importing ? "Importing..." : `Import ${validCount} row${validCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
