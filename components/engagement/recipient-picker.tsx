"use client";

import { useId, useMemo, useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, getInitials } from "@/lib/utils";
import type { PersonOption } from "@/lib/types";

const MAX_LISTED = 40;

// Searchable colleague picker for kudos.
export function RecipientPicker({
  people,
  value,
  onChange,
}: {
  people: PersonOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();

  const selected = people.find((p) => p.id === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? people.filter((p) => `${p.full_name} ${p.designation ?? ""}`.toLowerCase().includes(q))
      : people;
    return list.slice(0, MAX_LISTED);
  }, [people, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Choose a colleague to recognize"
          data-testid="kudos-recipient-trigger"
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {selected ? (
            <>
              <Avatar size="sm">
                <AvatarImage src={selected.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{getInitials(selected.full_name)}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{selected.full_name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Who do you want to recognize?</span>
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 gap-0 p-0"
      >
        <div className="relative border-b border-border p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or role..."
            aria-label="Search colleagues"
            className="h-8 w-full rounded-lg bg-muted/60 pr-2 pl-8 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
          />
        </div>
        <ul id={listId} className="max-h-60 overflow-y-auto p-1" role="listbox">
          {matches.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No one found</li>
          )}
          {matches.map((person) => (
            <li key={person.id} role="option" aria-selected={person.id === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(person.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted",
                  person.id === value && "bg-primary/10",
                )}
              >
                <Avatar size="sm">
                  <AvatarImage src={person.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{person.full_name}</span>
                  {person.designation && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {person.designation}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
