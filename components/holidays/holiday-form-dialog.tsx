"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Holiday } from "@/lib/types";

export function HolidayFormDialog({ holiday }: { holiday?: Holiday }) {
  const router = useRouter();
  const isEdit = Boolean(holiday);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(holiday?.name ?? "");
  const [date, setDate] = useState(holiday?.date ?? "");
  const [isRecurring, setIsRecurring] = useState(holiday?.is_recurring ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = isEdit ? `/api/holidays/${holiday!.id}` : "/api/holidays";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, is_recurring: isRecurring }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    if (!isEdit) {
      setName("");
      setDate("");
      setIsRecurring(false);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add holiday
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit holiday" : "Add holiday"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            <Label htmlFor="is_recurring" className="font-normal">
              Repeats every year
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save changes" : "Add holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
