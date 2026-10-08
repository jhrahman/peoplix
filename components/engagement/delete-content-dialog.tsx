"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Shared by posts and comments: confirms, calls the DELETE endpoint, then
// hands control back to the caller to drop the item from its local list.
export function DeleteContentDialog({
  url,
  title,
  description,
  triggerLabel,
  testId,
  size = "icon-sm",
  onDeleted,
}: {
  url: string;
  title: string;
  description: string;
  triggerLabel: string;
  testId: string;
  size?: "icon-sm" | "icon-xs";
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(url, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    // A 404 means someone else already removed it - the item is gone either
    // way, so drop it locally instead of leaving a dead card on screen.
    if (!res.ok && res.status !== 404) {
      toast.error(json.error ?? "Failed to delete");
      return;
    }

    setOpen(false);
    onDeleted();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
          aria-label={triggerLabel}
          data-testid={`${testId}-trigger`}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            variant="destructive-solid"
            data-testid={`${testId}-confirm`}
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
