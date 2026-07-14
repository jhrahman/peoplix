"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/signup-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        department: department || undefined,
        designation: designation || undefined,
        mobile: mobile || undefined,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center" data-testid="signup-success">
        <div className="relative flex size-16 items-center justify-center">
          <span className="success-check-ring absolute inset-0 rounded-full bg-primary/40" />
          <div className="success-check-badge relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Check className="size-8" strokeWidth={3} />
          </div>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          Thanks! Access Request Submitted. A System Admin will review the request soon.
        </p>
        <Button asChild className="w-full">
          <Link href="/login" data-testid="signup-success-ok">
            OK
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="signup-form">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          data-testid="signup-full-name-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="signup-email-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department (optional)</Label>
        <Input
          id="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          data-testid="signup-department-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="designation">Designation (optional)</Label>
        <Input
          id="designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          data-testid="signup-designation-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile (optional)</Label>
        <Input
          id="mobile"
          type="tel"
          autoComplete="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          data-testid="signup-mobile-input"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" data-testid="signup-error">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading} data-testid="signup-submit">
        {loading ? "Submitting..." : "Submit Sign Up Request"}
      </Button>
    </form>
  );
}
