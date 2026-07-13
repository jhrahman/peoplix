import type { UserRole } from "@/lib/types";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/layout/logo";

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="glass-panel hidden w-60 shrink-0 flex-col gap-6 rounded-2xl p-4 md:flex">
      <Logo className="px-2" id="sidebar" />
      <SidebarNav role={role} />
    </aside>
  );
}
