"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function rangeFromParams(searchParams: URLSearchParams): DateRange | undefined {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  return from
    ? { from: new Date(`${from}T00:00:00`), to: to ? new Date(`${to}T00:00:00`) : undefined }
    : undefined;
}

function presets(today: Date) {
  return [
    { label: "Today", range: { from: today, to: today } },
    { label: "Last 7 days", range: { from: subDays(today, 6), to: today } },
    { label: "Last 30 days", range: { from: subDays(today, 29), to: today } },
    { label: "This month", range: { from: startOfMonth(today), to: today } },
    {
      label: "Last month",
      range: {
        from: startOfMonth(subMonths(today, 1)),
        to: subDays(startOfMonth(today), 1),
      },
    },
    { label: "This week", range: { from: startOfWeek(today), to: today } },
  ];
}

function sameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.toDateString() === b.toDateString();
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const presetOptions = presets(today);

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
        <PopoverContent
          className="max-h-[var(--radix-popover-content-available-height)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto p-0 sm:w-auto"
          align="end"
          collisionPadding={12}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="flex shrink-0 flex-row gap-1 overflow-x-auto p-2 sm:w-36 sm:flex-col sm:overflow-visible sm:border-r">
              {presetOptions.map((preset) => {
                const active =
                  sameDay(pendingRange?.from, preset.range.from) &&
                  sameDay(pendingRange?.to, preset.range.to);
                return (
                  <Button
                    key={preset.label}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "justify-start whitespace-nowrap text-xs sm:text-sm",
                      active && "font-medium"
                    )}
                    onClick={() => handleSelect(preset.range)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
            <Calendar
              mode="range"
              selected={pendingRange}
              onSelect={handleSelect}
              defaultMonth={pendingRange?.from}
              numberOfMonths={1}
              className="mx-auto"
            />
          </div>
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
