"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { COMMENT_MAX_LENGTH } from "@/lib/engagement";
import { cn, getInitials } from "@/lib/utils";
import type { PostComment } from "@/lib/types";
import { DeleteContentDialog } from "@/components/engagement/delete-content-dialog";
import { CommentInput, type CommentPayload } from "@/components/engagement/comment-input";
import { CommentMediaView } from "@/components/engagement/comment-media-view";
import { ReactionBar } from "@/components/engagement/reaction-bar";
import { RichText } from "@/components/engagement/rich-text";
import { TimeAgo } from "@/components/engagement/time-ago";
import type { EngagementUser } from "@/components/engagement/engagement-feed";

// Mounted only once a post's thread is opened, so the feed itself never pays
// for comments nobody is looking at.
export function CommentSection({
  postId,
  currentUser,
  highlightId,
  onCountChange,
}: {
  postId: string;
  currentUser: EngagementUser;
  // A comment to scroll to and emphasise (the one a notification points at).
  highlightId?: string;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/posts/${postId}/comments`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) setComments(json.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    if (!highlightId || comments === null) return;
    document
      .getElementById(`comment-${highlightId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId, comments]);

  // Returns an error message to show, or null once the comment is saved.
  async function handleSubmit({ content, media }: CommentPayload) {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, media }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));

    if (!res?.ok) return json?.error ?? "Couldn't post your comment";

    setComments((prev) => [...(prev ?? []), json.data]);
    onCountChange(1);
    return null;
  }

  return (
    <div className="space-y-3 border-t border-border pt-3" data-testid={`post-comments-${postId}`}>
      {failed ? (
        <p className="text-sm text-destructive">Couldn&apos;t load comments. Try reopening the thread.</p>
      ) : comments === null ? (
        <div className="space-y-2" aria-label="Loading comments">
          <div className="h-9 w-2/3 animate-pulse rounded-2xl bg-muted/70" />
          <div className="h-9 w-1/2 animate-pulse rounded-2xl bg-muted/70" />
        </div>
      ) : (
        comments.length > 0 && (
          <ul className="space-y-2.5">
            {comments.map((comment) => {
              const name = comment.author?.full_name ?? "Former employee";
              const canDelete =
                comment.author?.id === currentUser.id || currentUser.role === "admin";
              return (
                <li
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className="group/comment flex items-start gap-2"
                  data-testid={`comment-${comment.id}`}
                >
                  <Avatar size="sm" className="mt-1">
                    <AvatarImage src={comment.author?.avatar_url ?? undefined} alt={name} />
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div
                      className={cn(
                        "w-fit max-w-full rounded-2xl rounded-tl-md bg-muted/60 px-3 py-2",
                        comment.id === highlightId && "bg-primary/15 ring-2 ring-primary/40",
                      )}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium">{name}</span>
                        <TimeAgo iso={comment.created_at} className="text-xs text-muted-foreground" />
                      </div>
                      {comment.content && (
                        <RichText text={comment.content} className="text-sm" clamp={false} />
                      )}
                      <CommentMediaView media={comment.media} id={comment.id} />
                    </div>
                    <ReactionBar
                      size="sm"
                      reactions={comment.reactions}
                      endpoint={`/api/posts/${postId}/comments/${comment.id}/reactions`}
                      onChange={(update) =>
                        setComments((prev) =>
                          prev?.map((c) =>
                            c.id === comment.id ? { ...c, reactions: update(c.reactions) } : c,
                          ) ?? prev,
                        )
                      }
                      testId={`comment-reactions-${comment.id}`}
                    />
                  </div>
                  {canDelete && (
                    // Always visible on touch screens; hover-revealed where hover exists.
                    <div className="mt-1 shrink-0 transition-opacity duration-150 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/comment:opacity-100">
                      <DeleteContentDialog
                        url={`/api/posts/${postId}/comments/${comment.id}`}
                        title="Delete this comment?"
                        description="The comment will be removed for everyone. This cannot be undone."
                        triggerLabel={`Delete ${name}'s comment`}
                        testId={`comment-delete-${comment.id}`}
                        size="icon-xs"
                        onDeleted={() => {
                          setComments((prev) => prev?.filter((c) => c.id !== comment.id) ?? prev);
                          onCountChange(-1);
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      <CommentInput
        onSubmit={handleSubmit}
        maxLength={COMMENT_MAX_LENGTH}
        placeholder="Write a comment... use @ to tag someone"
        ariaLabel="Write a comment"
        testId={`comment-input-${postId}`}
      />
    </div>
  );
}
