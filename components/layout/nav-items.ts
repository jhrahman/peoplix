import type { UserRole } from "@/lib/types";
import { CalendarDays, LayoutDashboard, Settings, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

// Extended as each module milestone ships (Holidays, Attendance).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "employee"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { href: "/leave", label: "Leave", icon: CalendarDays, roles: ["admin", "hr", "employee"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "hr", "employee"] },
];
