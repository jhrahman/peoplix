"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOwnProfile(formData);
        toast.success("Profile updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4" data-testid="settings-profile-form">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile.email} disabled data-testid="settings-email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name}
          required
          data-testid="settings-full-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
          data-testid="settings-phone"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          value={profile.department ?? "—"}
          disabled
          data-testid="settings-department"
        />
      </div>
      <Button type="submit" disabled={isPending} data-testid="settings-save">
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
