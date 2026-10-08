"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EVENT_LABEL, EVENT_NEEDS_ATTENTION } from "@/lib/account-status";
import type { AuthEvent } from "@/lib/auth-events";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/engagement/time-ago";

const ALL = "all";
const SEARCH_DELAY_MS = 300;

export function EventsPanel({
  initialEvents,
  initialHasMore,
}: {
  initialEvents: AuthEvent[];
  initialHasMore: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [type, setType] = useState(ALL);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only the newest request may apply: typing fires several and they can return out of order.
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function load(nextType: string, nextQuery: string, before?: string) {
    const id = ++latest.current;
    setLoading(true);

    const params = new URLSearchParams();
    if (nextType !== ALL) params.set("type", nextType);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (before) params.set("before", before);

    const res = await fetch(`/api/admin/auth-events?${params}`).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (id !== latest.current) return;
    setLoading(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't load activity");
      return;
    }
    setEvents((prev) => (before ? [...prev, ...json.data] : json.data));
    setHasMore(json.has_more);
  }

  function changeType(next: string) {
    setType(next);
    load(next, text);
  }

  function changeText(next: string) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(type, next), SEARCH_DELAY_MS);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={changeType}>
          <SelectTrigger className="w-56" aria-label="Filter by event" data-testid="events-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All events</SelectItem>
            {Object.entries(EVENT_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => changeText(e.target.value)}
            placeholder="Search by email..."
            aria-label="Search events by email"
            className="pr-8 pl-8"
            data-testid="events-search"
          />
          {text && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => changeText("")}
              className="absolute top-1/2 right-1 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X />
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Kept for 90 days. Shows what happened and when, never a password, link or token.
      </p>

      {events.length === 0 && !loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground" data-testid="events-empty">
          {type !== ALL || text.trim() ? "No events match." : "Nothing has happened yet."}
        </p>
      ) : (
        <div className={cn("overflow-x-auto rounded-xl transition-opacity", loading && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="events-list">
              {events.map((event) => {
                const attention = EVENT_NEEDS_ATTENTION.has(event.event);
                return (
                  <TableRow key={event.id} data-testid={`event-${event.id}`}>
                    <TableCell className="whitespace-nowrap">
                      <TimeAgo iso={event.created_at} className="text-sm" />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("h-6 gap-1", attention && "bg-destructive/10 text-destructive")}
                      >
                        {attention && <AlertTriangle />}
                        {EVENT_LABEL[event.event]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{event.email}</TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={event.detail ?? ""}>
                      {event.detail ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-40 truncate text-xs text-muted-foreground"
                      title={event.user_agent ?? ""}
                    >
                      {event.ip ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => load(type, text, events[events.length - 1]?.created_at)}
            data-testid="events-load-more"
          >
            {loading ? "Loading..." : "Show older"}
          </Button>
        </div>
      )}
    </div>
  );
}
