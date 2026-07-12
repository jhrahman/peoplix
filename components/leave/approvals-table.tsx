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
import type { LeaveRequest } from "@/lib/types";
import { leaveDays } from "@/lib/leave";

type LeaveRequestWithEmployee = LeaveRequest & { employee: { full_name: string } | null };

export function ApprovalsTable({ requests }: { requests: LeaveRequestWithEmployee[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleReview(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    await fetch(`/api/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    router.refresh();
  }

  const pending = requests.filter((r) => r.status === "pending");

  if (pending.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending requests.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending.map((request) => (
            <TableRow key={request.id} data-testid={`approval-row-${request.id}`}>
              <TableCell className="font-medium">
                {request.employee?.full_name ?? "—"}
              </TableCell>
              <TableCell className="capitalize">{request.leave_type}</TableCell>
              <TableCell>
                {request.start_date} → {request.end_date}
              </TableCell>
              <TableCell>{leaveDays(request.start_date, request.end_date)}</TableCell>
              <TableCell className="max-w-xs truncate">{request.reason ?? "—"}</TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button
                  size="sm"
                  disabled={busyId === request.id}
                  onClick={() => handleReview(request.id, "approved")}
                  data-testid={`approval-approve-${request.id}`}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === request.id}
                  onClick={() => handleReview(request.id, "rejected")}
                  data-testid={`approval-reject-${request.id}`}
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
