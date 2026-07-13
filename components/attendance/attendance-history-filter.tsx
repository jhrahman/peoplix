"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function rangeFromParams(searchParams: URLSearchParams): DateRange | undefined {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  return from
    ? { from: new Date(`${from}T00:00:00`), to: to ? new Date(`${to}T00:00:00`) : undefined }
    : undefined;
}

export function AttendanceHistoryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const appliedRange = rangeFromParams(searchParams);
  // Selection in progress inside the popover — kept local so picking the
  // "from" date doesn't navigate (and re-suspend/close the popover) before
  // the "to" date is picked too. Only committed to the URL once complete.
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(appliedRange);

  function pushRange(next: DateRange | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (next?.from) {
      params.set("from", format(next.from, "yyyy-MM-dd"));
    } else {
      params.delete("from");
    }
    if (next?.to) {
      params.set("to", format(next.to, "yyyy-MM-dd"));
    } else {
      params.delete("to");
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setPendingRange(appliedRange);
    }
    setOpen(nextOpen);
  }

  function handleSelect(next: DateRange | undefined) {
    setPendingRange(next);
    if (next?.from && next?.to) {
      pushRange(next);
      setOpen(false);
    }
  }

  function clearFilter() {
    setPendingRange(undefined);
    setOpen(false);
    pushRange(undefined);
  }

  const label = appliedRange?.from
    ? appliedRange.to
      ? `${format(appliedRange.from, "MMM d, yyyy")} – ${format(appliedRange.to, "MMM d, yyyy")}`
      : format(appliedRange.from, "MMM d, yyyy")
    : "Filter by date";

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            data-testid="attendance-history-filter-trigger"
          >
            <CalendarIcon className="h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={pendingRange}
            onSelect={handleSelect}
            defaultMonth={pendingRange?.from}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {appliedRange?.from && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFilter}
          disabled={isPending}
          aria-label="Clear date filter"
          data-testid="attendance-history-filter-clear"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
