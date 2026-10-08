"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MailPlus, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_HINT, STATUS_LABEL, type AccountStatus } from "@/lib/account-status";
import type { AccountRow } from "@/lib/account-activity";
import { cn, getInitials } from "@/lib/utils";
import { TimeAgo } from "@/components/engagement/time-ago";

type Filter = "all" | AccountStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "active", label: STATUS_LABEL.active },
  { value: "invite_pending", label: STATUS_LABEL.invite_pending },
  { value: "setup_incomplete", label: STATUS_LABEL.setup_incomplete },
  { value: "reset_pending", label: STATUS_LABEL.reset_pending },
];

function StatusBadge({ row }: { row: AccountRow }) {
  return (
    <Badge
      variant="secondary"
      title={STATUS_HINT[row.status]}
      data-testid={`account-status-${row.id}`}
      className={cn(
        "h-6",
        row.status === "active" && "bg-primary/10 text-primary",
        // Waiting a week or more is the one state an Admin should act on.
        row.stale && "bg-destructive/10 text-destructive",
      )}
    >
      {row.stale ? `${STATUS_LABEL[row.status]} · over a week` : STATUS_LABEL[row.status]}
    </Badge>
  );
}

function When({ iso }: { iso: string | null }) {
  return iso ? (
    <TimeAgo iso={iso} className="text-sm" />
  ) : (
    <span className="text-sm text-muted-foreground">Never</span>
  );
}

export function PeoplePanel({ people }: { people: AccountRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [resending, setResending] = useState<string | null>(null);
  // Remembered for this visit so a second click isn't invited right after the first.
  const [resent, setResent] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: people.length,
      active: 0,
      invite_pending: 0,
      setup_incomplete: 0,
      reset_pending: 0,
    };
    for (const p of people) result[p.status] += 1;
    return result;
  }, [people]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        (!q || `${p.full_name} ${p.email}`.toLowerCase().includes(q)),
    );
  }, [people, filter, query]);

  async function resendInvite(row: AccountRow) {
    setResending(row.id);
    const res = await fetch("/api/admin/account-activity/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: row.id }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setResending(null);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't resend the invite");
      return;
    }
    setResent((prev) => new Set(prev).add(row.id));
    toast.success(`Invite sent again to ${row.email}`);
  }

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Filter by status"
        className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            data-testid={`account-filter-${value}`}
            className={cn(
              "inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-all duration-150 outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
              filter === value
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background/40 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
            <span className="tabular-nums opacity-80">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          aria-label="Search employees"
          className="pr-8 pl-8"
          data-testid="account-search"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-1 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X />
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground" data-testid="account-empty">
          No one matches.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Password set</TableHead>
                <TableHead>Last signed in</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const canResend = row.status === "invite_pending" || row.status === "setup_incomplete";
                return (
                  <TableRow key={row.id} data-testid={`account-row-${row.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarImage src={row.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-xs">{getInitials(row.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.email} · {row.role}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge row={row} />
                    </TableCell>
                    <TableCell>
                      <When iso={row.createdAt} />
                    </TableCell>
                    <TableCell>
                      <When iso={row.passwordSetAt} />
                    </TableCell>
                    <TableCell>
                      <When iso={row.lastSignInAt} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canResend && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendInvite(row)}
                          disabled={resending === row.id || resent.has(row.id)}
                          data-testid={`account-resend-${row.id}`}
                        >
                          <MailPlus />
                          {resent.has(row.id) ? "Sent" : resending === row.id ? "Sending..." : "Resend invite"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
