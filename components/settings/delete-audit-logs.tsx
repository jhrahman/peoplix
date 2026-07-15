"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteAuditLogs() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleClear() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/clear-audit-logs", { method: "POST" });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Audit Log Cleanup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Permanently deletes every audit log entry for all employees. This only clears history —
          it doesn&apos;t affect any leave, overtime, attendance, or employee records.
        </p>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="delete-audit-logs-trigger">
              <History className="h-4 w-4" />
              Delete All Audit Logs
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all audit logs?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes every audit log entry for every employee. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <p className="text-sm text-destructive" data-testid="delete-audit-logs-error">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleClear();
                }}
                disabled={loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="delete-audit-logs-confirm-button"
              >
                {loading ? "Deleting..." : "Delete All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
