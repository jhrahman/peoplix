"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OvertimeRequest } from "@/lib/types";
import { formatOvertimeHours } from "@/lib/overtime";

type OvertimeRequestWithEmployee = OvertimeRequest & { employee: { full_name: string } | null };

export function OvertimeApprovalsTable({ requests }: { requests: OvertimeRequestWithEmployee[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleReview(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    await fetch(`/api/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    router.refresh();
  }

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
                  disabled={busyId === request.id}
                  onClick={() => handleReview(request.id, "approved")}
                  data-testid={`overtime-approval-approve-${request.id}`}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === request.id}
                  onClick={() => handleReview(request.id, "rejected")}
                  data-testid={`overtime-approval-reject-${request.id}`}
                >
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
