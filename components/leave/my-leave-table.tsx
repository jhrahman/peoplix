"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaveRequest, LeaveStatus } from "@/lib/types";
import { leaveDays } from "@/lib/leave";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";

const STATUS_VARIANT: Record<LeaveStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function MyLeaveTable({ requests }: { requests: LeaveRequest[] }) {
  const router = useRouter();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setCancelingId(id);
    await fetch(`/api/leave/${id}`, { method: "DELETE" });
    setCancelingId(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No leave requests yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} data-testid={`leave-request-row-${request.id}`}>
              <TableCell className="capitalize">{request.leave_type}</TableCell>
              <TableCell>
                {request.start_date} → {request.end_date}
              </TableCell>
              <TableCell>{leaveDays(request.start_date, request.end_date)}</TableCell>
              <TableCell className="max-w-xs truncate">{request.reason ?? "—"}</TableCell>
              <TableCell>
                <Badge
                  variant={STATUS_VARIANT[request.status]}
                  className="capitalize"
                  data-testid={`leave-request-status-${request.id}`}
                >
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {request.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <ApplyLeaveDialog request={request} />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancelingId === request.id}
                      onClick={() => handleCancel(request.id)}
                      data-testid={`leave-cancel-${request.id}`}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
