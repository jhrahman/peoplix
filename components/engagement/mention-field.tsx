"use client";

import { useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { findMentionQuery, matchPeople, type MentionMap } from "@/lib/mentions";
import { cn, getInitials } from "@/lib/utils";
import { useEngagement } from "@/components/engagement/engagement-context";

type Field = HTMLTextAreaElement | HTMLInputElement;

// A textarea/input where typing "@" suggests colleagues. The text stays plain
// ("@Jane Doe"); the picks are reported through `mentions` so the caller can
// turn them into stored tokens with serializeMentions() on submit.
export function MentionField({
  value,
  onValueChange,
  mentions,
  onMentionsChange,
  multiline = false,
  maxLength,
  onKeyDown,
  onPaste,
  className,
  placeholder,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: {
  value: string;
  onValueChange: (value: string) => void;
  mentions: MentionMap;
  onMentionsChange: (mentions: MentionMap) => void;
  multiline?: boolean;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<Field>) => void;
  onPaste?: (e: React.ClipboardEvent<Field>) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}) {
  const { people, currentUserId } = useEngagement();
  const ref = useRef<Field | null>(null);
  const [active, setActive] = useState<{ start: number; query: string } | null>(null);
  const [index, setIndex] = useState(0);

  const candidates = useMemo(
    () =>
      active
        ? matchPeople(
            people.filter((p) => p.id !== currentUserId),
            active.query,
          )
        : [],
    [active, people, currentUserId],
  );
  const open = candidates.length > 0;

  function sync(el: Field) {
    setActive(findMentionQuery(el.value, el.selectionStart ?? el.value.length));
  }

  function pick(person: (typeof candidates)[number]) {
    const el = ref.current;
    if (!el || !active) return;

    const caret = el.selectionStart ?? value.length;
    const insert = `@${person.full_name} `;
    const next = value.slice(0, active.start) + insert + value.slice(caret);

    if (maxLength !== undefined && next.length > maxLength) {
      setActive(null);
      return;
    }

    onValueChange(next);
    onMentionsChange({ ...mentions, [person.full_name]: person.id });
    setActive(null);

    const position = active.start + insert.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(position, position);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<Field>) {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setIndex((i) => (i + step + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(candidates[Math.min(index, candidates.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setActive(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  const shared = {
    value,
    maxLength,
    placeholder,
    className,
    onPaste,
    onKeyDown: handleKeyDown,
    onChange: (e: React.ChangeEvent<Field>) => {
      onValueChange(e.target.value);
      setIndex(0);
      sync(e.target);
    },
    onClick: (e: React.MouseEvent<Field>) => sync(e.currentTarget),
    // Arrow keys left/right move the caret in or out of an "@query".
    onKeyUp: (e: React.KeyboardEvent<Field>) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") sync(e.currentTarget);
    },
    onBlur: () => setActive(null),
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-autocomplete": "list" as const,
    "aria-label": ariaLabel,
    "data-testid": testId,
  };

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div className="min-w-0 flex-1">
          {multiline ? (
            <Textarea ref={ref as React.Ref<HTMLTextAreaElement>} {...shared} />
          ) : (
            <Input ref={ref as React.Ref<HTMLInputElement>} {...shared} />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={12}
        // Focus stays in the field; the list is driven by the keyboard or a tap.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-(--radix-popover-trigger-width) max-w-[22rem] min-w-56 gap-0 p-1"
      >
        <ul role="listbox" aria-label="Tag a colleague" data-testid="mention-suggestions">
          {candidates.map((person, i) => (
            <li key={person.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                // mousedown would blur the field and close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(person)}
                onMouseEnter={() => setIndex(i)}
                data-testid={`mention-option-${person.id}`}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm outline-none",
                  i === index && "bg-muted",
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
