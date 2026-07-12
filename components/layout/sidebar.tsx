import type { UserRole } from "@/lib/types";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="glass-panel hidden w-60 shrink-0 flex-col gap-6 rounded-2xl p-4 md:flex">
      <span className="px-2 text-lg font-semibold tracking-tight">Peoplix</span>
      <SidebarNav role={role} />
    </aside>
  );
}
