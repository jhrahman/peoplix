"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { SmilePlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ReactionSummary } from "@/lib/types";
import { EmojiGlyph } from "@/components/engagement/emoji-glyph";
import { EmojiPicker } from "@/components/engagement/emoji-picker";

type Update = (reactions: ReactionSummary[]) => ReactionSummary[];

// Pure, so the optimistic update and its rollback are exact inverses.
function applyToggle(list: ReactionSummary[], emoji: string, adding: boolean): ReactionSummary[] {
  const existing = list.find((r) => r.emoji === emoji);

  if (adding) {
    if (existing?.mine) return list;
    if (!existing) return [...list, { emoji, count: 1, mine: true, reactors: [] }];
    return list.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
  }

  if (!existing?.mine) return list;
  if (existing.count <= 1) return list.filter((r) => r.emoji !== emoji);
  return list.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r));
}

function reactionLabel(r: ReactionSummary) {
  const names = [...(r.mine ? ["You"] : []), ...r.reactors].slice(0, 3);
  const others = r.count - names.length;

  let who: string;
  if (others > 0) who = `${names.join(", ")} and ${others} other${others > 1 ? "s" : ""}`;
  else if (names.length > 1) who = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  else who = names[0] ?? "Someone";

  return `${who} reacted with ${r.emoji}`;
}

// Works for both posts and comments: `endpoint` is the .../reactions URL of
// whichever one it's attached to. Any number of different emojis per person,
// like Discord - tapping a chip you already used takes it back.
export function ReactionBar({
  reactions,
  endpoint,
  onChange,
  testId,
  size = "md",
  readOnly = false,
}: {
  reactions: ReactionSummary[];
  endpoint: string;
  onChange: (update: Update) => void;
  testId: string;
  size?: "md" | "sm";
  // Show the reactions but don't allow adding or removing (e.g. a closed card).
  readOnly?: boolean;
}) {
  // Per-emoji so quick taps on different emojis all go through, while a double
  // tap on the same one can't race itself.
  const pending = useRef(new Set<string>());

  async function toggle(emoji: string) {
    if (pending.current.has(emoji)) return;

    const adding = !reactions.find((r) => r.emoji === emoji)?.mine;
    onChange((list) => applyToggle(list, emoji, adding));
    pending.current.add(emoji);

    const res = await fetch(adding ? endpoint : `${endpoint}?emoji=${encodeURIComponent(emoji)}`, {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: adding ? JSON.stringify({ emoji }) : undefined,
    }).catch(() => null);

    pending.current.delete(emoji);

    if (!res?.ok) {
      onChange((list) => applyToggle(list, emoji, !adding));
      toast.error("Couldn't save your reaction. Please try again.");
    }
  }

  const chip = size === "sm" ? "h-6 gap-1 px-2 text-[0.7rem]" : "h-7 gap-1.5 px-2.5 text-xs";

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
      {reactions.map((r) => (
        <Tooltip key={r.emoji}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggle(r.emoji)}
              disabled={readOnly}
              aria-pressed={r.mine}
              aria-label={reactionLabel(r)}
              data-testid={`${testId}-${r.emoji}`}
              className={cn(
                "inline-flex cursor-pointer items-center rounded-full border font-medium tabular-nums transition-all duration-150 outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
                chip,
                r.mine
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <EmojiGlyph emoji={r.emoji} className="text-sm leading-none" />
              {r.count}
            </button>
          </TooltipTrigger>
          <TooltipContent>{reactionLabel(r)}</TooltipContent>
        </Tooltip>
      ))}

      {!readOnly && (
      <EmojiPicker
        onPick={toggle}
        selected={reactions.filter((r) => r.mine).map((r) => r.emoji)}
        testId={`${testId}-picker`}
      >
        <button
          type="button"
          aria-label="Add a reaction"
          data-testid={`${testId}-add`}
          className={cn(
            "inline-flex cursor-pointer items-center rounded-full border border-dashed border-border font-medium text-muted-foreground transition-all duration-150 outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 aria-expanded:border-primary/40 aria-expanded:text-primary",
            chip,
          )}
        >
          <SmilePlus className={size === "sm" ? "size-3" : "size-3.5"} />
          {reactions.length === 0 && size === "md" && "React"}
        </button>
      </EmojiPicker>
      )}
    </div>
  );
}
