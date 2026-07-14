import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/layout/logo";

export default function SignupPage() {
  return (
    <div className="app-background flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-8">
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
