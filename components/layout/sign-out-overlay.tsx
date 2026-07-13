"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function SignOutOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 backdrop-blur-md">
      <div className="glass-panel relative flex flex-col items-center gap-4 rounded-2xl px-10 py-8">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-primary/25 blur-2xl" />
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Signing out…</p>
      </div>
    </div>,
    document.body,
  );
}
