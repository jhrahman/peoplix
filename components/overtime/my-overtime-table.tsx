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
import type { OvertimeRequest, OvertimeStatus } from "@/lib/types";
import { formatOvertimeHours } from "@/lib/overtime";

const STATUS_VARIANT: Record<OvertimeStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function MyOvertimeTable({ requests }: { requests: OvertimeRequest[] }) {
  const router = useRouter();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setCancelingId(id);
    await fetch(`/api/overtime/${id}`, { method: "DELETE" });
    setCancelingId(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No overtime entries yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} data-testid={`overtime-row-${request.id}`}>
              <TableCell>{request.date}</TableCell>
              <TableCell>{formatOvertimeHours(request.hours)}</TableCell>
              <TableCell className="max-w-xs truncate">{request.reason ?? "—"}</TableCell>
              <TableCell>
                <Badge
                  variant={STATUS_VARIANT[request.status]}
                  className="capitalize"
                  data-testid={`overtime-status-${request.id}`}
                >
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {request.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancelingId === request.id}
                    onClick={() => handleCancel(request.id)}
                    data-testid={`overtime-cancel-${request.id}`}
                  >
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
