"use client";

import { useRef, useState } from "react";
import { Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, getInitials } from "@/lib/utils";
import { CopyEmailButton } from "@/components/directory/copy-email-button";
import { useEngagement } from "@/components/engagement/engagement-context";

const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 150;

// A small profile preview for a tagged (or recognized) colleague: photo, name,
// designation, email, and a vacation marker if they're on approved leave today.
//
// Works for everyone, not just mouse users: hovering opens it after a short
// delay (so skimming past a tag doesn't flash cards), tapping or pressing
// Enter/Space on the tag opens it on touch screens and keyboards, and Esc or
// an outside tap closes it. Date of birth is never part of the data this card
// has, by design.
export function PersonHoverCard({
  personId,
  fallbackName,
  className,
  testId,
  children,
}: {
  personId: string;
  fallbackName: string;
  className?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const { personById, onLeaveToday } = useEngagement();
  const person = personById.get(personId);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Hover-open then click shouldn't immediately close it again for mouse users.
  const usingMouse = useRef(false);

  // Someone who no longer exists (or isn't in the list): just show the name.
  if (!person) {
    return (
      <span className={className} data-testid={testId}>
        {children}
      </span>
    );
  }

  const schedule = (next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  const name = person.full_name || fallbackName;
  const onLeave = onLeaveToday.has(person.id);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearTimeout(timer.current);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          aria-label={`${name}, view profile preview`}
          onPointerEnter={(e) => {
            usingMouse.current = e.pointerType === "mouse";
            if (usingMouse.current) schedule(true, OPEN_DELAY_MS);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") schedule(false, CLOSE_DELAY_MS);
          }}
          onClick={(e) => {
            if (usingMouse.current && open) e.preventDefault();
          }}
          className={cn(
            "cursor-pointer align-baseline outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            className,
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        collisionPadding={12}
        // The card is informational: keep focus where it was.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={() => clearTimeout(timer.current)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") schedule(false, CLOSE_DELAY_MS);
        }}
        className="w-[min(20rem,calc(100vw-2rem))] flex-row items-start gap-3 p-3"
        data-testid="person-card"
      >
        <Avatar className="size-14">
          <AvatarImage src={person.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="text-base">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-heading text-base font-medium" data-testid="person-card-name">
            {name}
          </p>
          {person.designation && (
            <p className="truncate text-sm text-muted-foreground" data-testid="person-card-designation">
              {person.designation}
            </p>
          )}
          <div className="flex items-center gap-1">
            <a
              href={`mailto:${person.email}`}
              className="flex min-w-0 items-center gap-1.5 text-sm text-primary hover:underline"
              data-testid="person-card-email"
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{person.email}</span>
            </a>
            <CopyEmailButton email={person.email} testId="person-card-copy-email" />
          </div>
          {onLeave && (
            <Badge variant="secondary" className="mt-1 h-6 gap-1.5" data-testid="person-card-on-leave">
              <span role="img" aria-label="On leave" className="text-sm leading-none">
                🌴
              </span>
              On leave today
            </Badge>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
