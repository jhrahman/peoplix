"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Award, ChartColumn, ImagePlus, Megaphone, Pencil, Play, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  IMAGE_MAX_BYTES,
  KUDOS_VALUES,
  MEDIA_ACCEPT,
  MEDIA_RULES,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  POST_MAX_LENGTH,
  VIDEO_MAX_BYTES,
  checkAttachments,
  formatBytes,
  mediaKindOf,
  mimeOf,
  type MediaInput,
} from "@/lib/engagement";
import { serializeMentions, type MentionMap } from "@/lib/mentions";
import { cn, getInitials } from "@/lib/utils";
import type { FeedPost, MediaKind, PersonOption, PostKind } from "@/lib/types";
import { MentionField } from "@/components/engagement/mention-field";
import { RecipientPicker } from "@/components/engagement/recipient-picker";
import type { EngagementUser } from "@/components/engagement/engagement-feed";

type Attachment = { id: string; file: File; kind: MediaKind; previewUrl: string };

const MODES: { value: PostKind; label: string; icon: typeof Pencil }[] = [
  { value: "update", label: "Post", icon: Pencil },
  { value: "kudos", label: "Kudos", icon: Award },
  { value: "poll", label: "Poll", icon: ChartColumn },
];

const PLACEHOLDERS: Record<PostKind, string> = {
  update: "Share an update, a win, or a question with the team...",
  kudos: "Say what they did and why it mattered...",
  poll: "Ask the team a question...",
};

const SUBMIT_LABELS: Record<PostKind, string> = {
  update: "Post",
  kudos: "Give kudos",
  poll: "Start poll",
};

function describeUploadError(name: string, message: string) {
  if (/exceed|too large|maximum allowed/i.test(message)) {
    return `"${name}" is over the size limit (photos ${formatBytes(IMAGE_MAX_BYTES)}, videos ${formatBytes(VIDEO_MAX_BYTES)}).`;
  }
  if (/mime|not supported|invalid.*type/i.test(message)) {
    return `"${name}" isn't a supported file type.`;
  }
  return `Couldn't upload "${name}": ${message}`;
}

export function PostComposer({
  currentUser,
  people,
  onPosted,
}: {
  currentUser: EngagementUser;
  people: PersonOption[];
  onPosted: (post: FeedPost) => void;
}) {
  const [mode, setMode] = useState<PostKind>("update");
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<MentionMap>({});
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [kudosValue, setKudosValue] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "posting">("idle");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Preview URLs are object URLs - release them when the composer goes away.
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(
    () => () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl)),
    [],
  );

  // Only decides whether the toggle is shown - POST /api/posts re-checks the role.
  const canAnnounce = currentUser.role === "admin" || currentUser.role === "hr";
  const busy = status !== "idle";
  const remaining = POST_MAX_LENGTH - content.length;
  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const attachmentsAllowed = mode !== "poll";

  const canSubmit =
    !busy &&
    content.trim().length > 0 &&
    (mode !== "kudos" || (recipientId !== null && kudosValue !== null)) &&
    (mode !== "poll" || filledOptions.length >= POLL_MIN_OPTIONS);

  function switchMode(next: PostKind) {
    setMode(next);
    if (next !== "update") setIsAnnouncement(false);
    if (next === "poll") clearAttachments();
    setAttachmentErrors([]);
  }

  function addFiles(list: FileList | File[]) {
    const { accepted, errors } = checkAttachments(
      attachments.map((a) => a.file),
      Array.from(list),
    );
    setAttachmentErrors(errors);
    if (accepted.length === 0) return;

    setAttachments((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        kind: mediaKindOf(mimeOf(file))!,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      prev.filter((a) => a.id === id).forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return prev.filter((a) => a.id !== id);
    });
    setAttachmentErrors([]);
  }

  function clearAttachments() {
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  }

  async function removeUploaded(items: MediaInput[]) {
    if (items.length === 0) return;
    const supabase = createClient();
    for (const kind of ["image", "video"] as const) {
      const paths = items.filter((i) => i.kind === kind).map((i) => i.path);
      if (paths.length > 0) await supabase.storage.from(MEDIA_RULES[kind].bucket).remove(paths);
    }
  }

  // Files go straight from the browser to Supabase Storage - routing them
  // through an API route would hit Vercel's request-body limit on videos.
  // Storage itself enforces the per-bucket size and type caps.
  async function uploadAttachments(): Promise<MediaInput[]> {
    const supabase = createClient();

    const results = await Promise.allSettled(
      attachments.map(async ({ file, kind }): Promise<MediaInput> => {
        const mime = mimeOf(file);
        const path = `${currentUser.id}/${crypto.randomUUID()}.${MEDIA_RULES[kind].types[mime]}`;
        const { error } = await supabase.storage
          .from(MEDIA_RULES[kind].bucket)
          .upload(path, file, { contentType: mime, cacheControl: "31536000" });
        if (error) throw new Error(describeUploadError(file.name, error.message));
        return { kind, path, mime_type: mime, size_bytes: file.size };
      }),
    );

    const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");

    if (failure) {
      await removeUploaded(uploaded);
      throw failure.reason;
    }
    return uploaded;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;

    let uploaded: MediaInput[] = [];

    try {
      if (attachments.length > 0) {
        setStatus("uploading");
        uploaded = await uploadAttachments();
      }

      setStatus("posting");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: serializeMentions(content, mentions),
          kind: mode,
          is_announcement: isAnnouncement,
          kudos_recipient_id: mode === "kudos" ? recipientId : undefined,
          kudos_value: mode === "kudos" ? kudosValue : undefined,
          poll_options: mode === "poll" ? filledOptions : undefined,
          media: uploaded,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The API already removed the files it was handed on a validation
        // failure; a network-level failure never reached it, so do it here
        // (removing twice is harmless).
        await removeUploaded(uploaded);
        throw new Error(json.error ?? "Couldn't publish your post");
      }

      clearAttachments();
      setContent("");
      setMentions({});
      setIsAnnouncement(false);
      setRecipientId(null);
      setKudosValue(null);
      setPollOptions(["", ""]);
      setAttachmentErrors([]);
      onPosted(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't publish your post");
    } finally {
      setStatus("idle");
    }
  }

  const submitLabel =
    status === "uploading"
      ? "Uploading..."
      : status === "posting"
        ? "Posting..."
        : isAnnouncement
          ? "Publish"
          : SUBMIT_LABELS[mode];

  return (
    <Card
      className={cn("transition-shadow duration-200", dragging && "ring-2 ring-primary/60")}
      onDragOver={(e) => {
        if (!attachmentsAllowed || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!attachmentsAllowed || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3" data-testid="post-composer">
          <Avatar size="lg" className="hidden sm:flex">
            <AvatarImage src={currentUser.avatar_url ?? undefined} alt={currentUser.full_name} />
            <AvatarFallback>{getInitials(currentUser.full_name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-3">
            <div role="tablist" aria-label="What do you want to share?" className="flex gap-1">
              {MODES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => switchMode(value)}
                  disabled={busy}
                  data-testid={`composer-mode-${value}`}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                    mode === value
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {mode === "kudos" && (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <RecipientPicker
                  people={people.filter((p) => p.id !== currentUser.id)}
                  value={recipientId}
                  onChange={setRecipientId}
                />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Company value">
                  {KUDOS_VALUES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setKudosValue(v.id)}
                      aria-pressed={kudosValue === v.id}
                      data-testid={`kudos-value-${v.id}`}
                      className={cn(
                        "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all duration-150 outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
                        kudosValue === v.id
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="text-sm leading-none">{v.emoji}</span>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <MentionField
              multiline
              value={content}
              onValueChange={setContent}
              mentions={mentions}
              onMentionsChange={setMentions}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              onPaste={(e) => {
                if (attachmentsAllowed && e.clipboardData.files.length > 0) {
                  e.preventDefault();
                  addFiles(e.clipboardData.files);
                }
              }}
              maxLength={POST_MAX_LENGTH}
              placeholder={
                isAnnouncement ? "Write an announcement for the whole company..." : PLACEHOLDERS[mode]
              }
              aria-label={mode === "poll" ? "Poll question" : "Write a post"}
              className="max-h-72"
              data-testid="post-composer-input"
            />

            {mode === "poll" && (
              <div className="space-y-2" data-testid="poll-options">
                {pollOptions.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) =>
                        setPollOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                      }
                      maxLength={POLL_OPTION_MAX_LENGTH}
                      placeholder={`Option ${i + 1}`}
                      aria-label={`Poll option ${i + 1}`}
                      data-testid={`poll-option-input-${i}`}
                    />
                    {pollOptions.length > POLL_MIN_OPTIONS && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove option ${i + 1}`}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < POLL_MAX_OPTIONS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    data-testid="poll-add-option"
                  >
                    <Plus />
                    Add option
                  </Button>
                )}
              </div>
            )}

            {attachments.length > 0 && (
              <ul className="flex flex-wrap gap-2" data-testid="composer-attachments">
                {attachments.map((a) => (
                  <li key={a.id} className="group/attachment relative">
                    <div className="relative size-20 overflow-hidden rounded-lg border border-border bg-muted">
                      {a.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.previewUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <>
                          <video src={a.previewUrl} muted preload="metadata" className="size-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="size-6 fill-white text-white" />
                          </span>
                        </>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[0.65rem] text-white tabular-nums">
                        {formatBytes(a.file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      disabled={busy}
                      aria-label={`Remove ${a.file.name}`}
                      className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {attachmentErrors.length > 0 && (
              <div
                role="alert"
                className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="composer-attachment-errors"
              >
                {attachmentErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {attachmentsAllowed && (
                  <>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept={MEDIA_ACCEPT}
                      className="sr-only"
                      tabIndex={-1}
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                      data-testid="composer-file-input"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInput.current?.click()}
                      disabled={busy}
                      title={`Photos up to ${formatBytes(IMAGE_MAX_BYTES)} (4 max), or one video up to ${formatBytes(VIDEO_MAX_BYTES)}`}
                      data-testid="composer-attach"
                    >
                      <ImagePlus />
                      Photo / video
                    </Button>
                  </>
                )}
                {canAnnounce && mode === "update" && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground has-data-checked:text-primary">
                    <Checkbox
                      checked={isAnnouncement}
                      onCheckedChange={(checked) => setIsAnnouncement(checked === true)}
                      data-testid="post-composer-announcement"
                    />
                    <Megaphone className="size-4" />
                    Announcement
                  </label>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                {/* Stays out of the way until the limit is actually in sight. */}
                {remaining <= 200 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums text-muted-foreground",
                      remaining <= 20 && "text-destructive",
                    )}
                    aria-live="polite"
                  >
                    {remaining} left
                  </span>
                )}
                <Button type="submit" disabled={!canSubmit} data-testid="post-composer-submit">
                  {submitLabel}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
