import type { UserRole } from "@/lib/types";
import {
  CalendarDays,
  Clock,
  Contact,
  LayoutDashboard,
  PartyPopper,
  Settings,
  Timer,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "employee"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { href: "/directory", label: "Directory", icon: Contact, roles: ["admin", "hr", "employee"] },
  { href: "/leave", label: "Leave", icon: CalendarDays, roles: ["admin", "hr", "employee"] },
  { href: "/overtime", label: "Overtime", icon: Timer, roles: ["admin", "hr", "employee"] },
  { href: "/holidays", label: "Holidays", icon: PartyPopper, roles: ["admin", "hr", "employee"] },
  { href: "/attendance", label: "Attendance", icon: Clock, roles: ["admin", "hr", "employee"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "hr", "employee"] },
];
