"use client";

import type { CommentMedia } from "@/lib/comment-media";
import { MediaGallery } from "@/components/engagement/media-gallery";

// The photo, short clip or GIF on a comment, shown small. Photos and GIFs open
// the same full-size viewer as post photos when clicked.
export function CommentMediaView({ media, id }: { media: CommentMedia | null; id: string }) {
  if (!media) return null;

  return (
    <div className="mt-1.5" data-testid={`comment-media-${id}`} data-kind={media.kind}>
      <MediaGallery
        compact
        postId={id}
        media={[
          {
            id,
            kind: media.kind === "video" ? "video" : "image",
            url: media.url,
            mime_type: "",
            size_bytes: 0,
          },
        ]}
      />
    </div>
  );
}
