"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Cake, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeOwnBirthday, saveOwnBirthday } from "@/lib/actions/profile";
import { todayInDhaka } from "@/lib/attendance";

export type OwnBirthday = { date_of_birth: string; share_with_team: boolean } | null;

// Private by default in what it shows: teammates only ever see the day and
// month (never the year), and only if this stays ticked. It never appears in
// the Team Directory or on any profile.
export function BirthdayForm({ birthday }: { birthday: OwnBirthday }) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(birthday?.date_of_birth ?? "");
  const [share, setShare] = useState(birthday?.share_with_team ?? true);
  const [saved, setSaved] = useState(birthday);

  const dirty = date !== (saved?.date_of_birth ?? "") || share !== (saved?.share_with_team ?? true);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveOwnBirthday({ date_of_birth: date, share_with_team: share });
        setSaved({ date_of_birth: date, share_with_team: share });
        toast.success("Birthday saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeOwnBirthday();
        setSaved(null);
        setDate("");
        setShare(true);
        toast.success("Birthday removed.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4" data-testid="settings-birthday-form">
      <div className="space-y-2">
        <Label htmlFor="date_of_birth">Date of birth</Label>
        <Input
          id="date_of_birth"
          type="date"
          min="1900-01-01"
          max={todayInDhaka()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoComplete="bday"
          className="sm:max-w-56"
          data-testid="settings-dob"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-muted/50">
        <Checkbox
          checked={share}
          onCheckedChange={(checked) => setShare(checked === true)}
          className="mt-0.5"
          data-testid="settings-dob-share"
        />
        <span className="space-y-0.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Cake className="size-4 text-primary" />
            Let teammates celebrate my birthday
          </span>
          <span className="block text-muted-foreground">
            Shows your birthday (day and month only) in Celebrations so colleagues can send you wishes.
            Turn this off to keep it to yourself.
          </span>
        </span>
      </label>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        Your date of birth is private. Nobody else can see the year, and it never appears in the Team
        Directory or on your profile.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending || !date || !dirty} data-testid="settings-dob-save">
          {isPending ? "Saving..." : "Save birthday"}
        </Button>
        {saved && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleRemove}
            disabled={isPending}
            data-testid="settings-dob-remove"
          >
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}
