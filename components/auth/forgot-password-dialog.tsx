"use client";

import { useState } from "react";
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

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    // This dialog's form is portaled outside the login form's DOM, but React
    // events bubble through the component tree, not the DOM tree — without
    // stopPropagation the login form's onSubmit fires too and complains
    // about the missing password field.
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSent(false);
          setEmail("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          data-testid="forgot-password-trigger"
        >
          Forgot password?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
        </DialogHeader>
        {sent ? (
          <p className="text-sm text-muted-foreground" data-testid="forgot-password-sent">
            A password reset link has been sent to your email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
            <div className="space-y-2">
              <Label htmlFor="forgot_email">Email</Label>
              <Input
                id="forgot_email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-password-email-input"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" data-testid="forgot-password-error">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={loading} data-testid="forgot-password-submit">
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
