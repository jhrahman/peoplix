"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, MessageCircle, Pin, PinOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { kudosValueById } from "@/lib/engagement";
import { cn, getInitials } from "@/lib/utils";
import type { FeedPost } from "@/lib/types";
import { CommentSection } from "@/components/engagement/comment-section";
import { DeleteContentDialog } from "@/components/engagement/delete-content-dialog";
import { MediaGallery } from "@/components/engagement/media-gallery";
import { PollBody } from "@/components/engagement/poll-body";
import { ReactionBar } from "@/components/engagement/reaction-bar";
import { RichText } from "@/components/engagement/rich-text";
import { PersonHoverCard } from "@/components/engagement/person-card";
import { TimeAgo } from "@/components/engagement/time-ago";
import type { EngagementUser } from "@/components/engagement/engagement-feed";

function KudosBanner({ kudos }: { kudos: NonNullable<FeedPost["kudos"]> }) {
  const value = kudosValueById(kudos.value);

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 p-3"
      data-testid="kudos-banner"
    >
      <Avatar size="lg">
        <AvatarImage src={kudos.recipient.avatar_url ?? undefined} alt={kudos.recipient.full_name} />
        <AvatarFallback>{getInitials(kudos.recipient.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Kudos</p>
        <p className="truncate font-heading font-medium">
          <PersonHoverCard
            personId={kudos.recipient.id}
            fallbackName={kudos.recipient.full_name}
            testId={`kudos-recipient-${kudos.recipient.id}`}
            className="max-w-full truncate text-left hover:underline"
          >
            {kudos.recipient.full_name}
          </PersonHoverCard>
        </p>
        {kudos.recipient.designation && (
          <p className="truncate text-xs text-muted-foreground">{kudos.recipient.designation}</p>
        )}
      </div>
      {value && (
        <Badge className="h-6 bg-background/70 px-2.5 text-xs text-foreground">
          <span className="text-sm leading-none">{value.emoji}</span>
          {value.label}
        </Badge>
      )}
    </div>
  );
}

export function PostCard({
  post,
  currentUser,
  isNew = false,
  defaultCommentsOpen = false,
  highlightCommentId,
  onUpdate,
  onDelete,
}: {
  post: FeedPost;
  // Used by the single-post view a notification opens.
  defaultCommentsOpen?: boolean;
  highlightCommentId?: string;
  // Posted by someone else since this person's last visit.
  isNew?: boolean;
  currentUser: EngagementUser;
  onUpdate: (update: (post: FeedPost) => FeedPost) => void;
  onDelete: () => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [pinning, setPinning] = useState(false);

  const name = post.author?.full_name ?? "Former employee";
  const kind = post.is_announcement ? "announcement" : post.kind === "update" ? "post" : post.kind;
  // Mirrors the server rules (own content, or Admin; pinning is Admin/HR)
  // purely to decide what to render - the API routes and RLS enforce them.
  const canDelete = post.author?.id === currentUser.id || currentUser.role === "admin";
  const canPin = post.is_announcement && (currentUser.role === "admin" || currentUser.role === "hr");

  async function togglePin() {
    setPinning(true);
    const next = !post.is_pinned;
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: next }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setPinning(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't update the pin");
      return;
    }
    onUpdate((p) => ({ ...p, is_pinned: next }));
  }

  return (
    <Card
      className={cn(
        (post.is_announcement || post.kind === "kudos") && "border-primary/30 dark:border-primary/30",
      )}
      data-testid={`post-${post.id}`}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarImage src={post.author?.avatar_url ?? undefined} alt={name} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate font-heading text-[0.95rem] font-medium">{name}</span>
              {isNew && <Badge data-testid={`post-new-${post.id}`}>New</Badge>}
              {post.is_announcement && (
                <Badge className="bg-primary/10 text-primary">
                  <Megaphone />
                  Announcement
                </Badge>
              )}
              {post.is_pinned && (
                <Badge variant="secondary" data-testid={`post-pinned-${post.id}`}>
                  <Pin />
                  Pinned
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {post.author?.designation && <>{post.author.designation} · </>}
              <TimeAgo iso={post.created_at} />
            </p>
          </div>
          {canPin && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={togglePin}
              disabled={pinning}
              className="text-muted-foreground hover:text-primary"
              aria-label={post.is_pinned ? "Unpin announcement" : "Pin announcement"}
              title={post.is_pinned ? "Unpin" : "Pin to top"}
              data-testid={`post-pin-${post.id}`}
            >
              {post.is_pinned ? <PinOff /> : <Pin />}
            </Button>
          )}
          {canDelete && (
            <DeleteContentDialog
              url={`/api/posts/${post.id}`}
              title={`Delete this ${kind}?`}
              description={`The ${kind}, along with its comments, reactions and attachments, will be removed for everyone. This cannot be undone.`}
              triggerLabel={`Delete ${name}'s ${kind}`}
              testId={`post-delete-${post.id}`}
              onDeleted={onDelete}
            />
          )}
        </div>

        {post.kudos && <KudosBanner kudos={post.kudos} />}

        <RichText text={post.content} className={post.kind === "poll" ? "font-medium" : undefined} />

        {post.poll && (
          <PollBody
            postId={post.id}
            poll={post.poll}
            onChange={(update) =>
              onUpdate((p) => (p.poll ? { ...p, poll: update(p.poll) } : p))
            }
          />
        )}

        <MediaGallery media={post.media} postId={post.id} />

        <div className="flex items-start justify-between gap-3">
          <ReactionBar
            reactions={post.reactions}
            endpoint={`/api/posts/${post.id}/reactions`}
            onChange={(update) => onUpdate((p) => ({ ...p, reactions: update(p.reactions) }))}
            testId={`post-reactions-${post.id}`}
          />
          <button
            type="button"
            onClick={() => setCommentsOpen((open) => !open)}
            aria-expanded={commentsOpen}
            data-testid={`post-comments-toggle-${post.id}`}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground tabular-nums transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground"
          >
            <MessageCircle className="size-3.5" />
            {post.comment_count > 0 ? post.comment_count : "Comment"}
          </button>
        </div>

        {commentsOpen && (
          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            highlightId={highlightCommentId}
            onCountChange={(delta) =>
              onUpdate((p) => ({ ...p, comment_count: Math.max(0, p.comment_count + delta) }))
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
