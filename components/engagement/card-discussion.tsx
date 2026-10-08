"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CARD_COMMENT_MAX_LENGTH, type Occasion } from "@/lib/wish-constants";
import { getInitials } from "@/lib/utils";
import type { CardComment, ReactionSummary } from "@/lib/types";
import { DeleteContentDialog } from "@/components/engagement/delete-content-dialog";
import { CommentInput, type CommentPayload } from "@/components/engagement/comment-input";
import { CommentMediaView } from "@/components/engagement/comment-media-view";
import { ReactionBar } from "@/components/engagement/reaction-bar";
import { RichText } from "@/components/engagement/rich-text";
import { TimeAgo } from "@/components/engagement/time-ago";

// The conversation under a birthday / anniversary card: reactions for the card
// as a whole, and comments with @tags, like a post. Cards take new comments and
// reactions on the day and for a few days after (same window as wishes); after
// that they stay readable, but read-only.
export function CardDiscussion({
  recipientId,
  occasion,
  date,
  open,
  currentUserId,
  isAdmin,
  comments,
  onCommentsChange,
  reactions,
  onReactionsChange,
}: {
  recipientId: string;
  occasion: Occasion;
  date: string;
  open: boolean;
  currentUserId: string;
  isAdmin: boolean;
  comments: CardComment[];
  onCommentsChange: (update: (comments: CardComment[]) => CardComment[]) => void;
  reactions: ReactionSummary[];
  onReactionsChange: (update: (reactions: ReactionSummary[]) => ReactionSummary[]) => void;
}) {
  // Returns an error message to show, or null once the comment is saved.
  async function handleSubmit({ content, media }: CommentPayload) {
    const res = await fetch("/api/wishes/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: recipientId,
        occasion,
        occasion_date: date,
        content,
        media,
      }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));

    if (!res?.ok) return json?.error ?? "Couldn't post your comment";

    onCommentsChange((prev) => [...prev, json.data]);
    return null;
  }

  return (
    <section className="space-y-3 border-t border-border pt-3" data-testid="card-discussion">
      <ReactionBar
        reactions={reactions}
        endpoint={`/api/wishes/reactions/${recipientId}/${occasion}/${date}`}
        onChange={onReactionsChange}
        testId="card-reactions"
        readOnly={!open}
      />

      {comments.length > 0 && (
        <ul className="space-y-2.5" data-testid="card-comments">
          {comments.map((comment) => {
            const name = comment.author?.full_name ?? "Former employee";
            const mine = comment.author?.id === currentUserId;
            return (
              <li
                key={comment.id}
                className="group/comment flex items-start gap-2"
                data-testid={`card-comment-${comment.id}`}
              >
                <Avatar size="sm" className="mt-1">
                  <AvatarImage src={comment.author?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-muted/60 px-3 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{mine ? `${name} (you)` : name}</span>
                    <TimeAgo iso={comment.created_at} className="text-xs text-muted-foreground" />
                  </div>
                  {comment.content && (
                    <RichText text={comment.content} className="text-sm" clamp={false} />
                  )}
                  <CommentMediaView media={comment.media} id={comment.id} />
                </div>
                {(mine || isAdmin) && (
                  <div className="mt-1 shrink-0 transition-opacity duration-150 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/comment:opacity-100">
                    <DeleteContentDialog
                      url={`/api/wishes/comments/${comment.id}`}
                      title="Delete this comment?"
                      description="The comment will be removed for everyone. This cannot be undone."
                      triggerLabel={`Delete ${name}'s comment`}
                      testId={`card-comment-delete-${comment.id}`}
                      size="icon-xs"
                      onDeleted={() => onCommentsChange((prev) => prev.filter((c) => c.id !== comment.id))}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <CommentInput
          onSubmit={handleSubmit}
          maxLength={CARD_COMMENT_MAX_LENGTH}
          placeholder="Add a comment... use @ to tag someone"
          ariaLabel="Add a comment to this card"
          testId="card-comment-input"
        />
      ) : (
        <p className="text-xs text-muted-foreground" data-testid="card-closed-note">
          This card is closed for new comments and reactions.
        </p>
      )}
    </section>
  );
}
