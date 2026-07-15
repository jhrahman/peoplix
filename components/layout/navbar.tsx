import type { Profile } from "@/lib/types";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export function Navbar({ profile }: { profile: Profile }) {
  return (
    <header
      className={cn(
        "glass-panel sticky top-4 z-40 flex items-center justify-between rounded-2xl px-4 py-3",
        // Mobile-only: sticky so the menu/theme/user controls stay reachable
        // without scrolling back up. Sitting over scrolled content, even a
        // bumped-up bg-card/95 still let saturated colors (e.g. the teal
        // buttons in Settings) tint the blur as they passed underneath, so
        // this is fully opaque instead - the blur becomes a no-op, which is
        // fine. Desktop (md+) reverts to the original static, translucent header.
        "bg-card md:static md:top-auto md:z-auto md:bg-card/70",
      )}
    >
      <div className="flex items-center gap-2">
        <MobileNav role={profile.role} />
        <Logo className="md:hidden" iconClassName="size-6 -mr-[8px]" id="navbar" />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
