import { formatBytes, mimeOf } from "@/lib/file-utils";

// Attachments on comments are deliberately small: one per comment, a photo up
// to 1 MB, a short clip up to 5 MB, or a GIF picked from the GIF search. (Posts
// allow far more - see lib/engagement.ts.) Safe to import from Client
// Components: nothing server-only in here.

export const COMMENT_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const COMMENT_VIDEO_MAX_BYTES = 5 * 1024 * 1024;

export type CommentMediaKind = "image" | "video" | "gif";

// Mirrors the bucket settings and CHECK constraints in 0019 - Storage enforces
// the same caps even if a client skips these checks.
export const COMMENT_MEDIA_RULES = {
  image: {
    bucket: "comment-images",
    maxBytes: COMMENT_IMAGE_MAX_BYTES,
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>,
  },
  video: {
    bucket: "comment-videos",
    maxBytes: COMMENT_VIDEO_MAX_BYTES,
    types: { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" } as Record<string, string>,
  },
};

export const COMMENT_MEDIA_ACCEPT = [
  ...Object.keys(COMMENT_MEDIA_RULES.image.types),
  ...Object.keys(COMMENT_MEDIA_RULES.video.types),
].join(",");

// What the browser sends: a file already uploaded to Storage, or a GIF link.
export type CommentMediaInput =
  | { kind: "image" | "video"; path: string; mime_type: string; size_bytes: number }
  | { kind: "gif"; url: string };

// What a comment carries when it comes back from the API: always a ready-to-use URL.
export type CommentMedia = { kind: CommentMediaKind; url: string };

// Checks a file the user just picked, with a message that says what's wrong.
export function checkCommentFile(
  file: File,
): { ok: true; kind: "image" | "video" } | { ok: false; error: string } {
  const mime = mimeOf(file);
  const kind = mime in COMMENT_MEDIA_RULES.image.types ? "image" : mime in COMMENT_MEDIA_RULES.video.types ? "video" : null;

  if (!kind) {
    return {
      ok: false,
      error: `"${file.name}" isn't supported in comments. Use a JPG, PNG or WebP photo, a short MP4, WebM or MOV clip, or pick a GIF.`,
    };
  }
  if (file.size === 0) return { ok: false, error: `"${file.name}" is empty.` };
  if (file.size > COMMENT_MEDIA_RULES[kind].maxBytes) {
    return {
      ok: false,
      error: `"${file.name}" is ${formatBytes(file.size)}, but ${kind === "image" ? "photos" : "videos"} in comments can be at most ${formatBytes(COMMENT_MEDIA_RULES[kind].maxBytes)}. Use the post composer for bigger files.`,
    };
  }
  return { ok: true, kind };
}

// GIFs are links, not uploads, so the one thing that matters is where the link
// points: only the GIF provider's own servers are accepted. Anything else could
// be a tracking pixel or an unrelated image hosted somewhere we don't control.
export function isAllowedGifUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^(media\d*|i)\.giphy\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

// Server-side check of the attachment a client submits with a comment.
export function validateCommentMedia(
  raw: unknown,
  userId: string,
): { ok: true; media: CommentMediaInput | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, media: null };

  const item = raw as Partial<{ kind: string; path: string; mime_type: string; size_bytes: number; url: string }>;

  if (item.kind === "gif") {
    return isAllowedGifUrl(item.url)
      ? { ok: true, media: { kind: "gif", url: item.url } }
      : { ok: false, error: "That GIF isn't allowed" };
  }

  if (item.kind !== "image" && item.kind !== "video") {
    return { ok: false, error: "Unsupported attachment" };
  }
  const rules = COMMENT_MEDIA_RULES[item.kind];

  // The file must be inside the caller's own folder - never someone else's.
  if (
    typeof item.path !== "string" ||
    !new RegExp(`^${userId}/[A-Za-z0-9._-]+$`).test(item.path) ||
    item.path.includes("..")
  ) {
    return { ok: false, error: "Invalid attachment" };
  }
  if (typeof item.mime_type !== "string" || !(item.mime_type in rules.types)) {
    return { ok: false, error: "Unsupported attachment type" };
  }
  if (
    typeof item.size_bytes !== "number" ||
    !Number.isInteger(item.size_bytes) ||
    item.size_bytes < 1 ||
    item.size_bytes > rules.maxBytes
  ) {
    return {
      ok: false,
      error: `${item.kind === "image" ? "Photos" : "Videos"} in comments can be at most ${formatBytes(rules.maxBytes)}`,
    };
  }

  return {
    ok: true,
    media: { kind: item.kind, path: item.path, mime_type: item.mime_type, size_bytes: item.size_bytes },
  };
}

// The comment-table columns for an attachment (all null when there is none).
export function mediaColumns(media: CommentMediaInput | null) {
  return {
    media_kind: media?.kind ?? null,
    media_path: media && media.kind !== "gif" ? media.path : null,
    media_url: media?.kind === "gif" ? media.url : null,
    media_mime: media && media.kind !== "gif" ? media.mime_type : null,
    media_size: media && media.kind !== "gif" ? media.size_bytes : null,
  };
}

export type MediaColumns = ReturnType<typeof mediaColumns>;

// Columns -> what the client gets.
export function mediaFromColumns(row: Partial<MediaColumns>): CommentMedia | null {
  if (row.media_kind === "gif" && row.media_url) return { kind: "gif", url: row.media_url };
  if ((row.media_kind === "image" || row.media_kind === "video") && row.media_path) {
    return {
      kind: row.media_kind,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COMMENT_MEDIA_RULES[row.media_kind].bucket}/${row.media_path}`,
    };
  }
  return null;
}

// Stands in for the text in notification previews and Audit Log messages when
// a comment is only an attachment.
export function mediaLabel(media: { kind: CommentMediaKind } | null) {
  if (!media) return "";
  return media.kind === "gif" ? "a GIF" : media.kind === "video" ? "a video" : "a photo";
}
