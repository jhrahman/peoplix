"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTime } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";

export function CheckInOutCard({ today }: { today: Attendance | null }) {
  const router = useRouter();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleCheckIn() {
    setCheckingIn(true);
    const res = await fetch("/api/attendance", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to check in");
      setCheckingIn(false);
      return;
    }

    // Leave checkingIn===true on success: this whole branch unmounts once
    // router.refresh() delivers `today.check_in`, so there's no stale render
    // in between to flash "Check In" back before the row disappears.
    router.refresh();
  }

  async function handleCheckOut() {
    if (!today) return;
    setCheckingOut(true);
    const res = await fetch(`/api/attendance/${today.id}`, { method: "PATCH" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to check out");
      setCheckingOut(false);
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
              disabled={checkingIn}
              data-testid="attendance-check-in"
            >
              <LogIn className="h-4 w-4" />
              {checkingIn ? "Checking in..." : "Check In"}
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
              disabled={checkingOut}
              data-testid="attendance-check-out"
            >
              <LogOut className="h-4 w-4" />
              {checkingOut ? "Checking out..." : "Check Out"}
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
