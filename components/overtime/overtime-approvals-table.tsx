"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OvertimeRequestSummary } from "@/lib/types";
import { formatOvertimeHours } from "@/lib/overtime";

type OvertimeRequestWithEmployee = OvertimeRequestSummary & { employee: { full_name: string } | null };
type ReviewAction = "approved" | "rejected";

export function OvertimeApprovalsTable({ requests }: { requests: OvertimeRequestWithEmployee[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<{ id: string; action: ReviewAction } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReview(id: string, status: ReviewAction) {
    setBusy({ id, action: status });
    startTransition(async () => {
      await fetch(`/api/overtime/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  const rowBusy = (id: string) => isPending && busy?.id === id;

  const pending = requests.filter((r) => r.status === "pending");

  if (pending.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending overtime entries.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending.map((request) => (
            <TableRow key={request.id} data-testid={`overtime-approval-row-${request.id}`}>
              <TableCell className="font-medium">
                {request.employee?.full_name ?? "—"}
              </TableCell>
              <TableCell>{request.date}</TableCell>
              <TableCell>{formatOvertimeHours(request.hours)}</TableCell>
              <TableCell className="max-w-xs truncate">{request.reason ?? "—"}</TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button
                  size="sm"
                  disabled={rowBusy(request.id)}
                  onClick={() => handleReview(request.id, "approved")}
                  data-testid={`overtime-approval-approve-${request.id}`}
                >
                  {rowBusy(request.id) && busy?.action === "approved" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {rowBusy(request.id) && busy?.action === "approved" ? "Approving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={rowBusy(request.id)}
                  onClick={() => handleReview(request.id, "rejected")}
                  data-testid={`overtime-approval-reject-${request.id}`}
                >
                  {rowBusy(request.id) && busy?.action === "rejected" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {rowBusy(request.id) && busy?.action === "rejected" ? "Rejecting..." : "Reject"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
