"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SeedDefaultHolidaysButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/holidays/seed-defaults", { method: "POST" });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Something went wrong");
      return;
    }

    const { inserted, skipped, year } = json.data;
    if (inserted === 0) {
      toast.info(`All ${skipped} default ${year} holidays already exist.`);
    } else {
      toast.success(`Added ${inserted} default holiday${inserted === 1 ? "" : "s"} for ${year}.`);
    }
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      data-testid="holiday-seed-defaults"
    >
      <Sparkles className="h-4 w-4" />
      {loading ? "Adding..." : "Seed default holidays"}
    </Button>
  );
}
