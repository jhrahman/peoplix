import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-br from-zinc-100 via-white to-zinc-200 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Peoplix</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Peoplix</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            People management, simplified.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
