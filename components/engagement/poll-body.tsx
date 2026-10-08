"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/lib/types";

type Poll = NonNullable<FeedPost["poll"]>;

// What the poll looks like once the caller's vote is `optionId`. Pure, so the
// optimistic update and its rollback agree.
function applyVote(poll: Poll, optionId: string | null): Poll {
  const previous = poll.my_vote;
  return {
    my_vote: optionId,
    // First vote adds one; changing a vote adds none; clearing (rollback of a
    // first vote) removes the one that was optimistically added.
    total_votes: poll.total_votes + (optionId ? (previous ? 0 : 1) : previous ? -1 : 0),
    options: poll.options.map((o) => ({
      ...o,
      votes: o.votes + (o.id === optionId ? 1 : 0) - (o.id === previous ? 1 : 0),
    })),
  };
}

export function PollBody({
  postId,
  poll,
  onChange,
}: {
  postId: string;
  poll: Poll;
  onChange: (update: (poll: Poll) => Poll) => void;
}) {
  const pending = useRef(false);
  const hasVoted = poll.my_vote !== null;

  async function vote(optionId: string) {
    if (pending.current || poll.my_vote === optionId) return;

    const previous = poll.my_vote;
    onChange((p) => applyVote(p, optionId));
    pending.current = true;

    const res = await fetch(`/api/posts/${postId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_id: optionId }),
    }).catch(() => null);

    pending.current = false;

    if (!res?.ok) {
      // Undo: re-apply the previous vote (or clear it) on top of whatever is current.
      onChange((p) => applyVote(p, previous));
      toast.error("Couldn't save your vote. Please try again.");
    }
  }

  return (
    <div className="space-y-2" data-testid={`poll-${postId}`}>
      <ul className="space-y-2">
        {poll.options.map((option) => {
          const mine = poll.my_vote === option.id;
          const percent = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => vote(option.id)}
                aria-pressed={mine}
                data-testid={`poll-option-${option.id}`}
                className={cn(
                  "relative flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-all duration-150 outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
                  mine ? "border-primary/50" : "border-border hover:bg-muted/60",
                )}
              >
                {hasVoted && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-0 left-0 transition-[width] duration-300",
                      mine ? "bg-primary/20" : "bg-muted",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                )}
                <span className="relative flex min-w-0 items-center gap-2">
                  {mine && <Check className="size-4 shrink-0 text-primary" />}
                  <span className={cn("break-words", mine && "font-medium")}>{option.label}</span>
                </span>
                {hasVoted && (
                  <span className="relative shrink-0 text-xs text-muted-foreground tabular-nums">
                    {percent}% · {option.votes}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"} ·{" "}
        {hasVoted ? "Tap another option to change your vote" : "Vote to see the results"}
      </p>
    </div>
  );
}
