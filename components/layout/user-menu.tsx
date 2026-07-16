"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutOverlay } from "@/components/layout/sign-out-overlay";
import type { Profile } from "@/lib/types";
import { signOut } from "@/lib/actions/auth";
import { getInitials } from "@/lib/utils";

export function UserMenu({ profile }: { profile: Profile }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [, startTransition] = useTransition();

  function handleSignOut() {
    setIsSigningOut(true);
    startTransition(() => {
      signOut();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2" data-testid="user-menu-trigger">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="text-xs">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {profile.full_name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="capitalize">{profile.role}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
            data-testid="sign-out-button"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isSigningOut && <SignOutOverlay />}
    </>
  );
}
