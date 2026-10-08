"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, History, UserCheck, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountActivity } from "@/lib/account-activity";
import { cn } from "@/lib/utils";
import { EventsPanel } from "@/components/account-activity/events-panel";
import { PeoplePanel } from "@/components/account-activity/people-panel";

type Tab = "people" | "activity";

// The Admin-only boundary page for account health: where everyone is in the
// sign-up / invite / password journey (live, from Supabase Auth), and the
// history of what happened (the auth_events trail). It's separate from the
// Audit Log on purpose: different audience, retention and sensitivity.
export function AccountActivityView({ people, pendingRequests, events, hasMoreEvents }: AccountActivity) {
  const [tab, setTab] = useState<Tab>("people");

  const waiting = people.filter((p) => p.status === "invite_pending" || p.status === "setup_incomplete");
  const stale = waiting.filter((p) => p.stale).length;
  const resets = people.filter((p) => p.status === "reset_pending").length;

  const tiles = [
    { label: "Active", value: people.filter((p) => p.status === "active").length, hint: "Signed up and signing in", icon: UserCheck },
    { label: "Not finished", value: waiting.length, hint: stale ? `${stale} waiting over a week` : "Invited, still setting up", icon: UserPlus, attention: stale > 0 },
    { label: "Reset pending", value: resets, hint: "Asked to reset a password", icon: History },
    { label: "Access requests", value: pendingRequests, hint: "Waiting for your review", icon: ClipboardList, href: "/employees" },
  ];

  const tabs: { value: Tab; label: string }[] = [
    { value: "people", label: "People" },
    { value: "activity", label: "Activity" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ label, value, hint, icon: Icon, href, attention }) => {
          const body = (
            <Card
              size="sm"
              className={cn(
                "h-full transition-all duration-200",
                href && "glass-interactive",
                attention && "border-destructive/40",
              )}
              data-testid={`account-tile-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardContent className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
                  <p className={cn("text-xs", attention ? "text-destructive" : "text-muted-foreground")}>{hint}</p>
                </div>
                <Icon className="size-5 text-primary" />
              </CardContent>
            </Card>
          );
          return href ? (
            <Link key={label} href={href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {body}
            </Link>
          ) : (
            <div key={label}>{body}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Account activity</CardTitle>
          <div role="tablist" aria-label="Account activity sections" className="flex gap-1">
            {tabs.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                data-testid={`account-tab-${value}`}
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  tab === value
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab === "people" ? (
            <PeoplePanel people={people} />
          ) : (
            <EventsPanel initialEvents={events} initialHasMore={hasMoreEvents} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
