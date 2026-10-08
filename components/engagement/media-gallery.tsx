"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PostMedia } from "@/lib/types";

// Previews are deliberately compact so a busy feed stays scannable; the full
// size is one click away in the viewer. Layout by count: 1 = a single
// thumbnail at its natural shape, 2 = side by side, 3 = one wide + two,
// 4 = a 2x2 grid.
function cellClass(index: number, count: number) {
  if (count === 1) return "max-h-56 w-auto max-w-full sm:max-h-64";
  if (count === 3 && index === 0) return "col-span-2 aspect-[2/1]";
  return count === 2 ? "aspect-square" : "aspect-[4/3]";
}

// Plain <img>/<video>, not next/image: attachments are already size-capped
// and served from Supabase Storage's CDN, and routing them through Next's
// image optimizer would spend the free-tier optimization quota for no gain.
export function MediaGallery({
  media,
  postId,
  compact = false,
}: {
  media: PostMedia[];
  postId: string;
  // Comment-sized: a small thumbnail / clip (the full size is still one click away).
  compact?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (media.length === 0) return null;

  if (media[0].kind === "video") {
    return (
      <video
        src={media[0].url}
        controls
        preload="metadata"
        playsInline
        aria-label="Video attached to this post"
        className={cn(
          "w-full rounded-xl bg-black/90",
          compact ? "max-h-44 max-w-[16rem]" : "max-h-64 max-w-md",
        )}
        data-testid={`post-video-${postId}`}
      />
    );
  }

  const step = (delta: number) =>
    setActive((i) => (i === null ? i : (i + delta + media.length) % media.length));

  return (
    <>
      <div
        className={cn(
          "grid gap-1.5 overflow-hidden rounded-xl",
          media.length > 1 ? "w-full max-w-sm grid-cols-2" : "w-fit max-w-full",
        )}
        data-testid={`post-images-${postId}`}
      >
        {media.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`View photo ${i + 1} of ${media.length}`}
            className="cursor-zoom-in overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.url}
              alt=""
              loading="lazy"
              className={cn(
                "w-full object-cover transition-transform duration-200 hover:scale-[1.02]",
                compact ? "max-h-36 w-auto max-w-[14rem]" : cellClass(i, media.length),
              )}
            />
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent
          className="max-w-[min(95vw,64rem)] gap-0 bg-background/95 p-2 sm:max-w-[min(95vw,64rem)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") step(-1);
            if (e.key === "ArrowRight") step(1);
          }}
        >
          <DialogTitle className="sr-only">Photo viewer</DialogTitle>
          <DialogDescription className="sr-only">
            {active !== null && `Photo ${active + 1} of ${media.length}`}
          </DialogDescription>
          {active !== null && (
            <div className="relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media[active].url}
                alt=""
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
              {media.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 rounded-full"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 rounded-full"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
