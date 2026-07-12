"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildIsoFromDateAndTime, toLocalTimeInputValue } from "@/lib/attendance";
import type { Attendance } from "@/lib/types";

export function EditAttendanceDialog({ record }: { record: Attendance }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkInTime, setCheckInTime] = useState(toLocalTimeInputValue(record.check_in));
  const [checkOutTime, setCheckOutTime] = useState(toLocalTimeInputValue(record.check_out));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/attendance/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        check_in: checkInTime ? buildIsoFromDateAndTime(record.date, checkInTime) : null,
        check_out: checkOutTime ? buildIsoFromDateAndTime(record.date, checkOutTime) : null,
      }),
    });

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit attendance for ${record.date}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit attendance — {record.date}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in">Check in</Label>
              <Input
                id="check_in"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out">Check out</Label>
              <Input
                id="check_out"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
