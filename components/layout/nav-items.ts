import type { UserRole } from "@/lib/types";
import { LayoutDashboard, Settings, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

// Extended as each module milestone ships (Leave, Holidays, Attendance).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "employee"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "hr", "employee"] },
];
