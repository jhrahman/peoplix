"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { WISH_MAX_LENGTH, WISH_PRESETS, type Occasion } from "@/lib/wish-constants";
import { cn, getInitials } from "@/lib/utils";
import type { CardComment, PostAuthor, ReactionSummary } from "@/lib/types";
import { useEngagement } from "@/components/engagement/engagement-context";
import { DeleteContentDialog } from "@/components/engagement/delete-content-dialog";
import { CardDiscussion } from "@/components/engagement/card-discussion";
import { TimeAgo } from "@/components/engagement/time-ago";

export type WishTarget = {
  recipientId: string;
  occasion: Occasion;
  // The day being celebrated (YYYY-MM-DD).
  date: string;
  years: number | null;
};

type Wish = {
  id: string;
  message: string;
  created_at: string;
  years: number | null;
  sender: PostAuthor | null;
};

type Props = {
  target: WishTarget | null;
  currentUserId: string;
  isAdmin: boolean;
  // Can the viewer add one (right day, not themselves, hasn't already)?
  canWish: boolean;
  onClose: () => void;
  // Keeps the card's "N wishes" / "Wished" state on the page in step.
  onChange: (change: { count: number; mine?: boolean }) => void;
};

// The shared card for one celebration. Everyone can read it (like a card
// passed around the office); each person signs it once.
export function WishDialog(props: Props) {
  const { target, onClose } = props;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {target && (
        // Keyed so opening a different celebration starts fresh (no stale list).
        <WishCard
          key={`${target.recipientId}:${target.occasion}:${target.date}`}
          {...props}
          target={target}
        />
      )}
    </Dialog>
  );
}

function WishCard({
  target,
  currentUserId,
  isAdmin,
  canWish,
  onChange,
}: Props & { target: WishTarget }) {
  const { personById } = useEngagement();
  const recipient = personById.get(target.recipientId);
  const isSelf = target.recipientId === currentUserId;
  const firstName = recipient?.full_name.split(" ")[0] ?? "them";

  const [wishes, setWishes] = useState<Wish[] | null>(null);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const alreadyWished = wishes?.some((w) => w.sender?.id === currentUserId) ?? false;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      recipient: target.recipientId,
      occasion: target.occasion,
      date: target.date,
    });

    fetch(`/api/wishes?${params}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (cancelled) return;
        setWishes(json.data);
        setComments(json.comments ?? []);
        setReactions(json.reactions ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [target.recipientId, target.occasion, target.date]);

  const years = target.years ?? wishes?.find((w) => w.years)?.years ?? null;
  const anniversary = `${years ? `${years}-year ` : ""}work anniversary`;
  const trophy = target.occasion === "milestone" ? "🏆" : "🎊";
  const title =
    target.occasion === "birthday"
      ? isSelf
        ? "Your birthday wishes 🎉"
        : `${firstName}'s birthday 🎂`
      : target.occasion === "new_joiner"
        ? isSelf
          ? "Your welcome card 👋"
          : `Welcome ${firstName}! 👋`
        : isSelf
          ? `Your ${anniversary} ${trophy}`
          : `${firstName}'s ${anniversary} ${trophy}`;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    const res = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: target.recipientId,
        occasion: target.occasion,
        occasion_date: target.date,
        message: text,
      }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setSending(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't send your wish");
      return;
    }

    setWishes((prev) => [json.data, ...(prev ?? [])]);
    setMessage("");
    onChange({ count: 1, mine: true });
    toast.success(
      target.occasion === "birthday"
        ? "Birthday wish sent 🎂"
        : target.occasion === "new_joiner"
          ? "Welcome message sent 👋"
          : "Wish sent 🏆",
    );
  }

  return (
    <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto sm:max-w-md" data-testid="wish-dialog">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="size-12">
            <AvatarImage src={recipient?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{getInitials(recipient?.full_name ?? "?")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <DialogTitle className="font-heading text-lg">{title}</DialogTitle>
            <DialogDescription>
              {recipient?.full_name}
              {recipient?.designation ? ` · ${recipient.designation}` : ""}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {canWish && !isSelf && !alreadyWished && wishes !== null && (
        <form onSubmit={handleSend} className="space-y-2.5" data-testid="wish-form">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick messages">
            {WISH_PRESETS[target.occasion].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMessage(preset)}
                aria-pressed={message === preset}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
                  message === preset
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {preset}
              </button>
            ))}
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={WISH_MAX_LENGTH}
            placeholder={`Write something kind for ${firstName}...`}
            aria-label={`Your wish for ${firstName}`}
            className="min-h-20"
            data-testid="wish-input"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {WISH_MAX_LENGTH - message.length} left
            </span>
            <Button type="submit" disabled={!message.trim() || sending} data-testid="wish-send">
              <Gift />
              {sending ? "Sending..." : "Send wish"}
            </Button>
          </div>
        </form>
      )}

      {alreadyWished && !isSelf && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary" data-testid="wish-already">
          Your wish is on the card. Thanks for spreading the joy! ✓
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {wishes ? `${wishes.length} ${wishes.length === 1 ? "wish" : "wishes"}` : "Wishes"}
        </p>
        {failed ? (
          <p className="text-sm text-destructive">Couldn&apos;t load the wishes. Close and try again.</p>
        ) : wishes === null ? (
          <div className="space-y-2" aria-label="Loading wishes">
            <div className="h-12 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-12 animate-pulse rounded-lg bg-muted/70" />
          </div>
        ) : wishes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {isSelf
              ? "Wishes from your teammates will appear here."
              : "No wishes yet. Be the first to send one!"}
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1" data-testid="wish-list">
            {wishes.map((wish) => {
              const name = wish.sender?.full_name ?? "Former employee";
              const mine = wish.sender?.id === currentUserId;
              return (
                <li key={wish.id} className="flex items-start gap-2.5" data-testid={`wish-${wish.id}`}>
                  <Avatar size="sm" className="mt-0.5">
                    <AvatarImage src={wish.sender?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-muted/60 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{mine ? `${name} (you)` : name}</span>
                      <TimeAgo iso={wish.created_at} className="text-xs text-muted-foreground" />
                    </div>
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {wish.message}
                    </p>
                  </div>
                  {(mine || isAdmin) && (
                    <DeleteContentDialog
                      url={`/api/wishes/${wish.id}`}
                      title="Remove this wish?"
                      description="It will be taken off the card for everyone."
                      triggerLabel={`Remove ${name}'s wish`}
                      testId={`wish-delete-${wish.id}`}
                      size="icon-xs"
                      onDeleted={() => {
                        setWishes((prev) => prev?.filter((w) => w.id !== wish.id) ?? prev);
                        onChange({ count: -1, mine: mine ? false : undefined });
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {wishes !== null && (
        <CardDiscussion
          recipientId={target.recipientId}
          occasion={target.occasion}
          date={target.date}
          open={canWish}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          comments={comments}
          onCommentsChange={setComments}
          reactions={reactions}
          onReactionsChange={setReactions}
        />
      )}
    </DialogContent>
  );
}
