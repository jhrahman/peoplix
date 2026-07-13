import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/layout/logo";

export default function LoginPage() {
  return (
    <div className="app-background flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
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
