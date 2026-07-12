import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-br from-zinc-100 via-white to-zinc-200 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Peoplix</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              People management, simplified.
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
