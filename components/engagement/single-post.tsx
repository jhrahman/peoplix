"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import type { FeedPost, PersonOption } from "@/lib/types";
import { EngagementProvider } from "@/components/engagement/engagement-context";
import type { EngagementUser } from "@/components/engagement/engagement-feed";
import { PostCard } from "@/components/engagement/post-card";

// Just the one post a notification points at, with its comments already open
// - not the whole feed.
export function SinglePost({
  initialPost,
  currentUser,
  people,
  onLeaveTodayIds,
  highlightCommentId,
}: {
  initialPost: FeedPost;
  currentUser: EngagementUser;
  people: PersonOption[];
  onLeaveTodayIds: string[];
  highlightCommentId?: string;
}) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);

  return (
    <EngagementProvider
      currentUserId={currentUser.id}
      people={people}
      onLeaveTodayIds={onLeaveTodayIds}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/engagement"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          data-testid="single-post-back"
        >
          <ArrowLeft className="size-4" />
          Back to feed
        </Link>
        <PostCard
          post={post}
          currentUser={currentUser}
          defaultCommentsOpen
          highlightCommentId={highlightCommentId}
          onUpdate={(update) => setPost(update)}
          onDelete={() => {
            toast.success("Deleted");
            router.push("/engagement");
          }}
        />
      </div>
    </EngagementProvider>
  );
}
