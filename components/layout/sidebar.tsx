import Link from "next/link";
import type { UserRole } from "@/lib/types";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/layout/logo";

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="glass-panel hidden w-60 shrink-0 flex-col gap-6 rounded-2xl p-4 md:flex">
      <Link
        href="/"
        aria-label="Peoplix home"
        data-testid="logo-link-sidebar"
        className="rounded-lg transition-opacity duration-200 outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Logo className="px-2" id="sidebar" />
      </Link>
      <SidebarNav role={role} />
    </aside>
  );
}
