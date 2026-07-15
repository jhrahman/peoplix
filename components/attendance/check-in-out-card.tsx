"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTime } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";

type PendingAction = "check-in" | "check-out" | null;

export function CheckInOutCard({ today }: { today: Attendance | null }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [justCompleted, setJustCompleted] = useState<PendingAction>(null);

  // Wait for `today` itself to reflect the check-in/out (i.e. router.refresh()
  // has actually re-pulled the row from the DB) before flipping to the success
  // state — flipping on a fixed timeout races the refresh and flashes the
  // stale label back for a moment.
  useEffect(() => {
    if (pendingAction === "check-in" && today?.check_in) {
      setPendingAction(null);
      setJustCompleted("check-in");
      const timer = setTimeout(() => setJustCompleted(null), 1200);
      return () => clearTimeout(timer);
    }
    if (pendingAction === "check-out" && today?.check_out) {
      setPendingAction(null);
      setJustCompleted("check-out");
      const timer = setTimeout(() => setJustCompleted(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [today, pendingAction]);

  async function handleCheckIn() {
    setPendingAction("check-in");
    const res = await fetch("/api/attendance", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to check in");
      setPendingAction(null);
      return;
    }

    router.refresh();
  }

  async function handleCheckOut() {
    if (!today) return;
    setPendingAction("check-out");
    const res = await fetch(`/api/attendance/${today.id}`, { method: "PATCH" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to check out");
      setPendingAction(null);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
      </CardHeader>
      <CardContent
        className="flex flex-col items-center gap-4 py-6 text-center"
        data-testid="attendance-today-card"
      >
        {!today?.check_in ? (
          <>
            <p className="text-sm text-muted-foreground">You haven&apos;t checked in yet.</p>
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={pendingAction === "check-in" || justCompleted === "check-in"}
              data-testid="attendance-check-in"
            >
              {justCompleted === "check-in" ? (
                <Check className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {justCompleted === "check-in"
                ? "Checked in"
                : pendingAction === "check-in"
                  ? "Checking in..."
                  : "Check In"}
            </Button>
          </>
        ) : !today.check_out ? (
          <>
            <p className="text-sm text-muted-foreground">
              Checked in at <span className="font-medium text-foreground">{formatTime(today.check_in)}</span>
            </p>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleCheckOut}
              disabled={pendingAction === "check-out" || justCompleted === "check-out"}
              data-testid="attendance-check-out"
            >
              {justCompleted === "check-out" ? (
                <Check className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {justCompleted === "check-out"
                ? "Checked out"
                : pendingAction === "check-out"
                  ? "Checking out..."
                  : "Check Out"}
            </Button>
          </>
        ) : (
          <>
            <p
              className="text-2xl font-heading font-semibold text-primary"
              data-testid="attendance-today-duration"
            >
              {formatDuration(today.check_in, today.check_out)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatTime(today.check_in)} → {formatTime(today.check_out)} · done for today
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
