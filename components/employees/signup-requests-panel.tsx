"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignupRequest } from "@/lib/types";

export function SignupRequestsPanel({
  initialRequests,
}: {
  initialRequests: SignupRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(id: string, status: "approved" | "rejected") {
    setActingOn(id);
    setError(null);

    const res = await fetch(`/api/signup-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setActingOn(null);
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setActingOn(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Sign Up Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" data-testid="signup-requests-error">
            {error}
          </p>
        )}
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <ul className="space-y-3" data-testid="signup-requests-list">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
                data-testid="signup-request-item"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{req.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{req.email}</p>
                  {(req.department || req.designation) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[req.designation, req.department].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    disabled={actingOn === req.id}
                    onClick={() => review(req.id, "approved")}
                    data-testid="signup-request-approve"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actingOn === req.id}
                    onClick={() => review(req.id, "rejected")}
                    data-testid="signup-request-reject"
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
