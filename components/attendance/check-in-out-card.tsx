"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTime } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";

export function CheckInOutCard({ today }: { today: Attendance | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    setLoading(true);
    await fetch("/api/attendance", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function handleCheckOut() {
    if (!today) return;
    setLoading(true);
    await fetch(`/api/attendance/${today.id}`, { method: "PATCH" });
    setLoading(false);
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
              disabled={loading}
              data-testid="attendance-check-in"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Checking in..." : "Check In"}
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
              disabled={loading}
              data-testid="attendance-check-out"
            >
              <LogOut className="h-4 w-4" />
              {loading ? "Checking out..." : "Check Out"}
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
