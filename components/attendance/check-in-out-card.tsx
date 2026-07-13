"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTime } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";

type Status = "idle" | "loading" | "success";

export function CheckInOutCard({ today }: { today: Attendance | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const loading = status === "loading";

  async function handleCheckIn() {
    setStatus("loading");
    const res = await fetch("/api/attendance", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to check in");
      setStatus("idle");
      return;
    }

    setStatus("success");
    router.refresh();
    setTimeout(() => setStatus("idle"), 1200);
  }

  async function handleCheckOut() {
    if (!today) return;
    setStatus("loading");
    const res = await fetch(`/api/attendance/${today.id}`, { method: "PATCH" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to check out");
      setStatus("idle");
      return;
    }

    setStatus("success");
    router.refresh();
    setTimeout(() => setStatus("idle"), 1200);
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
              disabled={loading || status === "success"}
              data-testid="attendance-check-in"
            >
              {status === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {status === "success" ? "Checked in" : loading ? "Checking in..." : "Check In"}
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
              disabled={loading || status === "success"}
              data-testid="attendance-check-out"
            >
              {status === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {status === "success" ? "Checked out" : loading ? "Checking out..." : "Check Out"}
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
