import type { Profile } from "@/lib/types";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function Navbar({ profile }: { profile: Profile }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <header className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2">
        <MobileNav items={items} />
        <span className="font-semibold tracking-tight md:hidden">Peoplix</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
