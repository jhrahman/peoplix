"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "verifying" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function verify() {
      // Yield a tick first so every setState below happens from an async
      // continuation rather than synchronously within the effect body.
      await Promise.resolve();

      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashError = hash.get("error_description");

      if (hashError) {
        setError(hashError.replace(/\+/g, " "));
        setStatus("invalid");
        return;
      }

      if (!accessToken || !refreshToken) {
        setStatus("invalid");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setError(error.message);
        setStatus("invalid");
      } else {
        window.history.replaceState(null, "", window.location.pathname);
        setStatus("ready");
      }
    }

    verify();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (status === "verifying") {
    return <p className="text-center text-sm text-muted-foreground">Verifying your link...</p>;
  }

  if (status === "invalid") {
    return (
      <div className="space-y-4 text-center" data-testid="reset-password-invalid">
        <p className="text-sm text-destructive">
          {error ?? "This reset link is invalid or has expired."}
        </p>
        <p className="text-sm text-muted-foreground">
          Ask an Admin/HR to resend your invite, or request a new link from the login page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="reset-password-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          data-testid="reset-password-confirm-input"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" data-testid="reset-password-error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        data-testid="reset-password-submit"
      >
        {loading ? "Saving..." : "Set password"}
      </Button>
    </form>
  );
}
