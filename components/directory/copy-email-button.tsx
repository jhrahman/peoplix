"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CopyEmailButton({
  email,
  testId = "directory-copy-email",
}: {
  email: string;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Clipboard access is blocked on insecure origins and in some embedded views.
      toast.error("Couldn't copy. Select the address and copy it manually.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleCopy}
          aria-label={`Copy ${email}`}
          data-testid={testId}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy email"}</TooltipContent>
    </Tooltip>
  );
}
