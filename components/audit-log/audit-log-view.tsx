"use client";

import { useMemo, useState } from "react";
import { Info, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AUDIT_LOG_RETENTION_DAYS } from "@/lib/audit";
import { formatDateTime, toDhakaDateString } from "@/lib/datetime";
import type { AuditAction, AuditLog } from "@/lib/types";

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  cancel: "Cancelled",
  approve: "Approved",
  reject: "Rejected",
  joined: "Joined",
};

const ACTION_VARIANT: Record<AuditAction, "default" | "secondary" | "destructive"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  cancel: "destructive",
  approve: "default",
  reject: "destructive",
  joined: "default",
};

export function AuditLogView({ logs, isAdmin }: { logs: AuditLog[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (isAdmin && search.trim()) {
        const q = search.trim().toLowerCase();
        const matches = [log.actor_name, log.actor_email, log.comment].some((field) =>
          field.toLowerCase().includes(q),
        );
        if (!matches) return false;
      }

      const logDate = toDhakaDateString(new Date(log.created_at));
      if (fromDate && logDate < fromDate) return false;
      if (toDate && logDate > toDate) return false;

      return true;
    });
  }, [logs, search, fromDate, toDate, isAdmin]);

  const hasFilters = Boolean(search || fromDate || toDate);

  function clearFilters() {
    setSearch("");
    setFromDate("");
    setToDate("");
  }

  // Keep the range valid in both directions: picking a "From" after the
  // current "To" pulls "To" up to match (and vice versa), rather than
  // silently allowing an empty/invalid range - the min/max props below
  // already stop this in browsers that enforce them, but typed input can
  // still bypass that, so it's re-checked here too.
  function handleFromChange(value: string) {
    setFromDate(value);
    if (value && toDate && value > toDate) {
      setToDate(value);
    }
  }

  function handleToChange(value: string) {
    setToDate(value);
    if (value && fromDate && value < fromDate) {
      setFromDate(value);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Audit logs are kept for {AUDIT_LOG_RETENTION_DAYS} days and then automatically removed.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="audit-log-empty">
          No audit logs yet.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {isAdmin && (
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or action..."
                  className="pl-8"
                  data-testid="audit-log-search-input"
                />
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="audit_log_from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="audit_log_from"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="w-[9.5rem]"
                  data-testid="audit-log-from-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audit_log_to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="audit_log_to"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => handleToChange(e.target.value)}
                  className="w-[9.5rem]"
                  data-testid="audit-log-to-input"
                />
              </div>
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  aria-label="Clear filters"
                  data-testid="audit-log-clear-filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="audit-log-no-match">
              No audit logs match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id} data-testid={`audit-log-row-${log.id}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.actor_name}</span>
                          <span className="text-xs text-muted-foreground">{log.actor_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_VARIANT[log.action]}>
                          {ACTION_LABEL[log.action]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-sm text-sm">{log.comment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
