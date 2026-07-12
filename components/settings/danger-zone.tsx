"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CONFIRM_PHRASE = "DELETE ALL DATA";

export function DangerZone({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const canConfirm = confirmText === CONFIRM_PHRASE;

  async function handleClear() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/clear-database", { method: "POST" });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setConfirmText("");
    router.refresh();
  }

  const clearButton = (
    <Button variant="destructive" disabled={!isAdmin} data-testid="danger-zone-clear-trigger">
      <AlertTriangle className="h-4 w-4" />
      Clear Database
    </Button>
  );

  return (
    <Card className="max-w-lg border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Wipes all leave requests, leave balances, holidays, attendance, and overtime records.
          Employee, HR, and Admin accounts are never touched.
        </p>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            {isAdmin ? (
              clearButton
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">{clearButton}</span>
                </TooltipTrigger>
                <TooltipContent>Admin only</TooltipContent>
              </Tooltip>
            )}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all data?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes every leave request, leave balance, holiday,
                attendance, and overtime record. This cannot be undone. Type{" "}
                <span className="font-mono font-semibold text-foreground">{CONFIRM_PHRASE}</span>{" "}
                to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmation phrase</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
                data-testid="danger-zone-confirm-input"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" data-testid="danger-zone-error">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleClear();
                }}
                disabled={!canConfirm || loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="danger-zone-confirm-button"
              >
                {loading ? "Clearing..." : "Clear Database"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
