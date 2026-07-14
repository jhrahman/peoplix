"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Info } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OVERTIME_HOUR_OPTIONS, formatOvertimeHours } from "@/lib/overtime";
import { todayInDhaka } from "@/lib/attendance";
import type { OvertimeRequestSummary } from "@/lib/types";

export function LogOvertimeDialog({ entry }: { entry?: OvertimeRequestSummary }) {
  const router = useRouter();
  const isEdit = Boolean(entry);
  const today = todayInDhaka();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(entry?.date ?? today);
  const [hours, setHours] = useState(String(entry?.hours ?? 1));
  const [reason, setReason] = useState(entry?.reason ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = isEdit ? `/api/overtime/${entry!.id}` : "/api/overtime";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, hours: Number(hours), reason }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    if (!isEdit) {
      setDate(today);
      setHours("1");
      setReason("");
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit overtime entry"
            data-testid={`overtime-edit-trigger-${entry!.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" data-testid="overtime-log-trigger">
            <Plus className="h-4 w-4" />
            Log overtime
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit overtime entry" : "Log overtime"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid={isEdit ? "overtime-edit-form" : "overtime-log-form"}
        >
          <div className="space-y-2">
            <Label htmlFor="overtime_date">Date</Label>
            <Input
              id="overtime_date"
              type="date"
              required
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="overtime-form-date"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="overtime_hours">Hours</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground"
                    aria-label="Overtime hours rules"
                    data-testid="overtime-hours-info-trigger"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent data-testid="overtime-hours-tooltip">
                  Minimum 0.5 hours, in 30-minute increments.
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger id="overtime_hours" data-testid="overtime-form-hours">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OVERTIME_HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatOvertimeHours(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overtime_reason">Reason (optional)</Label>
            <Input
              id="overtime_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Month-end reporting deadline"
              data-testid="overtime-form-reason"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="overtime-form-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading} data-testid="overtime-form-submit">
              {loading ? "Saving..." : isEdit ? "Save changes" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
