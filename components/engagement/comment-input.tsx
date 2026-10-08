"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Play, SendHorizontal, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  COMMENT_MEDIA_ACCEPT,
  COMMENT_MEDIA_RULES,
  checkCommentFile,
  type CommentMediaInput,
} from "@/lib/comment-media";
import { formatBytes, mimeOf } from "@/lib/file-utils";
import { serializeMentions, type MentionMap } from "@/lib/mentions";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import { useEngagement } from "@/components/engagement/engagement-context";
import { GifPicker, type GifResult } from "@/components/engagement/gif-picker";
import { MentionField } from "@/components/engagement/mention-field";

type Attachment =
  | { kind: "image" | "video"; file: File; previewUrl: string }
  | { kind: "gif"; url: string; preview: string };

export type CommentPayload = { content: string; media: CommentMediaInput | null };

// The comment box used everywhere a comment can be written (post threads and
// birthday / anniversary cards): text with @tags, plus one small attachment - a
// photo (up to 1 MB), a short clip (up to 5 MB), or a GIF from search. Photos
// and clips go straight from the browser to Storage (whose buckets enforce the
// same caps); a GIF is just a link. `onSubmit` returns an error message to show,
// or null when the comment was saved.
export function CommentInput({
  onSubmit,
  maxLength,
  placeholder,
  ariaLabel,
  testId,
}: {
  onSubmit: (payload: CommentPayload) => Promise<string | null>;
  maxLength: number;
  placeholder: string;
  ariaLabel: string;
  testId: string;
}) {
  const { currentUserId, personById } = useEngagement();
  const me = currentUserId ? personById.get(currentUserId) : undefined;

  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<MentionMap>({});
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "sending">("idle");
  const fileInput = useRef<HTMLInputElement>(null);

  // Object URLs for previews need releasing when the box goes away.
  const attachmentRef = useRef(attachment);
  useEffect(() => {
    attachmentRef.current = attachment;
  }, [attachment]);
  useEffect(
    () => () => {
      const a = attachmentRef.current;
      if (a && a.kind !== "gif") URL.revokeObjectURL(a.previewUrl);
    },
    [],
  );

  const busy = status !== "idle";
  const canSend = (draft.trim().length > 0 || attachment !== null) && !busy;

  function clearAttachment() {
    if (attachment && attachment.kind !== "gif") URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    const check = checkCommentFile(file);
    if (!check.ok) {
      setProblem(check.error);
      return;
    }
    setProblem(null);
    clearAttachment();
    setAttachment({ kind: check.kind, file, previewUrl: URL.createObjectURL(file) });
  }

  function pickGif(gif: GifResult) {
    setProblem(null);
    clearAttachment();
    setAttachment({ kind: "gif", url: gif.url, preview: gif.preview });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    let uploaded: { bucket: string; path: string } | null = null;
    let media: CommentMediaInput | null = null;

    if (attachment?.kind === "gif") {
      media = { kind: "gif", url: attachment.url };
    } else if (attachment) {
      setStatus("uploading");
      const rules = COMMENT_MEDIA_RULES[attachment.kind];
      const mime = mimeOf(attachment.file);
      const path = `${currentUserId}/${crypto.randomUUID()}.${rules.types[mime]}`;
      const { error } = await createClient()
        .storage.from(rules.bucket)
        .upload(path, attachment.file, { contentType: mime, cacheControl: "31536000" });

      if (error) {
        setStatus("idle");
        // Storage's own size/type caps are the backstop for the checks above.
        setProblem(
          /exceed|too large|maximum allowed/i.test(error.message)
            ? `That ${attachment.kind === "image" ? "photo" : "clip"} is over the ${formatBytes(rules.maxBytes)} limit for comments.`
            : `Couldn't upload that file: ${error.message}`,
        );
        return;
      }
      uploaded = { bucket: rules.bucket, path };
      media = {
        kind: attachment.kind,
        path,
        mime_type: mime,
        size_bytes: attachment.file.size,
      };
    }

    setStatus("sending");
    const error = await onSubmit({ content: serializeMentions(draft.trim(), mentions), media });
    setStatus("idle");

    if (error) {
      // The server also removes the file when it rejects the comment; removing a
      // file that's already gone is harmless, and covers a request that never arrived.
      if (uploaded) await createClient().storage.from(uploaded.bucket).remove([uploaded.path]);
      toast.error(error);
      return;
    }

    setDraft("");
    setMentions({});
    setProblem(null);
    clearAttachment();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" data-testid={`${testId}-form`}>
      <div className="flex items-center gap-1.5">
        <Avatar size="sm">
          <AvatarImage src={me?.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{getInitials(me?.full_name ?? "?")}</AvatarFallback>
        </Avatar>
        <MentionField
          value={draft}
          onValueChange={setDraft}
          mentions={mentions}
          onMentionsChange={setMentions}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="rounded-full px-3.5"
          data-testid={testId}
        />
        <input
          ref={fileInput}
          type="file"
          accept={COMMENT_MEDIA_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          data-testid={`${testId}-file`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          aria-label="Add a photo or short video"
          title={`Photo up to ${formatBytes(COMMENT_MEDIA_RULES.image.maxBytes)} or clip up to ${formatBytes(COMMENT_MEDIA_RULES.video.maxBytes)}`}
          data-testid={`${testId}-attach`}
        >
          <ImagePlus />
        </Button>
        <GifPicker onPick={pickGif} disabled={busy} />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 rounded-full"
          disabled={!canSend}
          aria-label="Send comment"
          data-testid={`${testId}-submit`}
        >
          <SendHorizontal />
        </Button>
      </div>

      {attachment && (
        <div className="ml-8 flex items-start gap-2" data-testid={`${testId}-attachment`}>
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
            {attachment.kind === "gif" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.preview} alt="Selected GIF" className="block h-20 w-auto" />
            ) : attachment.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.previewUrl} alt="Selected photo" className="block h-20 w-auto" />
            ) : (
              <div className="relative">
                <video src={attachment.previewUrl} muted preload="metadata" className="block h-20 w-auto" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="size-5 fill-white text-white" />
                </span>
              </div>
            )}
            <span className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-[0.65rem] text-white">
              {attachment.kind === "gif" ? "GIF" : formatBytes(attachment.file.size)}
            </span>
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            disabled={busy}
            aria-label="Remove attachment"
            className="flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            <X className="size-3" />
          </button>
          {status === "uploading" && (
            <span className="text-xs text-muted-foreground">Uploading...</span>
          )}
        </div>
      )}

      {problem && (
        <p
          role="alert"
          className="ml-8 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
          data-testid={`${testId}-problem`}
        >
          {problem}
        </p>
      )}
    </form>
  );
}
