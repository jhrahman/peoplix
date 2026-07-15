"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LeaveRequestSummary, LeaveType } from "@/lib/types";
import { leaveDays } from "@/lib/leave";

// Parsed as local midnight (not UTC) so the calendar's day-of-week checks
// line up with what the user sees, regardless of browser timezone.
function parseDateStr(value: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function ApplyLeaveDialog({ request }: { request?: LeaveRequestSummary }) {
  const router = useRouter();
  const isEdit = Boolean(request);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState<LeaveType>(request?.leave_type ?? "casual");
  const [startDate, setStartDate] = useState(request?.start_date ?? "");
  const [endDate, setEndDate] = useState(request?.end_date ?? "");
  const [reason, setReason] = useState(request?.reason ?? "");
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const days = endDate && startDate && endDate >= startDate
    ? leaveDays(startDate, endDate)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Start date and end date are required");
      return;
    }
    setLoading(true);
    setError(null);

    const url = isEdit ? `/api/leave/${request!.id}` : "/api/leave";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
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
    if (!isEdit) {
      setStartDate("");
      setEndDate("");
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
            aria-label="Edit leave request"
            data-testid={`leave-edit-trigger-${request!.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" data-testid="leave-apply-trigger">
            <Plus className="h-4 w-4" />
            Apply for leave
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit leave request" : "Apply for leave"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid={isEdit ? "leave-edit-form" : "leave-apply-form"}
        >
          <div className="space-y-2">
            <Label htmlFor="leave_type">Leave type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
              <SelectTrigger id="leave_type" data-testid="leave-apply-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="start_date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                    data-testid="leave-apply-start-date"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {startDate ? format(parseDateStr(startDate)!, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseDateStr(startDate)}
                    defaultMonth={parseDateStr(startDate) ?? parseDateStr(endDate)}
                    onSelect={(date) => {
                      if (!date) return;
                      setStartDate(format(date, "yyyy-MM-dd"));
                      setStartOpen(false);
                    }}
                    disabled={(date) =>
                      isWeekend(date) || (endDate ? date > parseDateStr(endDate)! : false)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="end_date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal",
                      !endDate && "text-muted-foreground",
                    )}
                    data-testid="leave-apply-end-date"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {endDate ? format(parseDateStr(endDate)!, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseDateStr(endDate)}
                    defaultMonth={parseDateStr(endDate) ?? parseDateStr(startDate)}
                    onSelect={(date) => {
                      if (!date) return;
                      setEndDate(format(date, "yyyy-MM-dd"));
                      setEndOpen(false);
                    }}
                    disabled={(date) =>
                      isWeekend(date) || (startDate ? date < parseDateStr(startDate)! : false)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {days !== null && (
            <p className="text-sm text-muted-foreground">
              {days} {days === 1 ? "day" : "days"} of leave
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="leave-apply-reason"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="leave-apply-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading || !startDate || !endDate}
              data-testid="leave-apply-submit"
            >
              {loading ? "Saving..." : isEdit ? "Save changes" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
