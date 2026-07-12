import type { UserRole } from "@/lib/types";
import { LayoutDashboard, Settings } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

// Extended as each module milestone ships (Employees, Leave, Holidays, Attendance).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "employee"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "hr", "employee"] },
];
